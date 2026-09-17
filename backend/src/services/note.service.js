import path from 'path';
import Note from '../models/Note.js';
import Enrollment from '../models/Enrollment.js';
import { ApiError } from '../utils/ApiError.js';
import { hasPurchased } from './payment.service.js';
import { SECURE_UPLOADS_ROOT } from '../middleware/upload.js';
import { hasStudentAccess } from '../utils/studentAccess.js';
import { getBatchIdsForStudent } from './studentBatch.service.js';

const ACTIVE_STATUSES = ['active', 'completed'];

async function getEnrolledCourseIds(studentId) {
  const enrollments = await Enrollment.find({ studentId, status: { $in: ACTIVE_STATUSES } }).lean();
  return enrollments.map((e) => e.courseId.toString());
}

/**
 * True if a note has no course/batch targeting at all (visible to every
 * student, the original and still-default behavior), or the student is
 * eligible via at least one assigned course or batch.
 */
async function isNoteEligibleForStudent(note, studentId) {
  const hasTargeting = (note.courseIds?.length || 0) > 0 || (note.batchIds?.length || 0) > 0;
  if (!hasTargeting) return true;
  const [courseIds, batchIds] = await Promise.all([getEnrolledCourseIds(studentId), getBatchIdsForStudent(studentId)]);
  const assignedCourses = (note.courseIds || []).map((c) => c.toString());
  const assignedBatches = (note.batchIds || []).map((b) => b.toString());
  return assignedCourses.some((c) => courseIds.includes(c)) || assignedBatches.some((b) => batchIds.includes(b));
}

export async function getAllNotes({ track } = {}) {
  const filter = track ? { track } : {};
  return Note.find(filter).populate('courseIds', 'title track').populate('batchIds', 'name').sort({ createdAt: -1 }).lean();
}

/**
 * Student-facing listing — unlike getAllNotes (the mentor's management
 * view, which always shows everything), this respects the admin-managed
 * per-student notes-access denylist and each note's optional course/batch
 * targeting.
 */
export async function getAvailableNotesForStudent(studentId) {
  if (!(await hasStudentAccess(studentId, 'notes'))) return [];
  const [courseIds, batchIds] = await Promise.all([getEnrolledCourseIds(studentId), getBatchIdsForStudent(studentId)]);
  return Note.find({
    $or: [
      { courseIds: { $size: 0 }, batchIds: { $size: 0 } },
      { courseIds: { $in: courseIds } },
      { batchIds: { $in: batchIds } },
    ],
  })
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Public (no-auth) listing for the homepage's free-downloads section — free
 * notes only, and never one targeted to a specific course/batch (a
 * targeted note is for particular students, not a public download).
 */
export async function getPublicFreeNotes() {
  return Note.find({
    category: 'free',
    courseIds: { $size: 0 },
    batchIds: { $size: 0 },
    $or: [{ fileKey: { $exists: true, $ne: null } }, { driveUrl: { $exists: true, $ne: null } }],
  })
    .select('title description track fileName fileSizeBytes createdAt')
    .sort({ createdAt: -1 })
    .lean();
}

export async function getNoteById(id) {
  const note = await Note.findById(id).lean();
  if (!note) throw new ApiError(404, 'Note not found');
  return note;
}

/** Cheap lookup for the paid-content permission gate. */
export async function getNotePaidStatus(id) {
  const note = await Note.findById(id).select('category').lean();
  if (!note) throw new ApiError(404, 'Note not found');
  return note;
}

export async function createNote(payload) {
  if (payload.category === 'premium' && !(payload.price > 0)) {
    throw new ApiError(400, 'Premium notes require a price greater than 0');
  }
  const note = await Note.create(payload);
  return note.toObject();
}

export async function updateNote(id, payload) {
  const note = await Note.findByIdAndUpdate(id, payload, { new: true, runValidators: true }).lean();
  if (!note) throw new ApiError(404, 'Note not found');
  return note;
}

export async function deleteNote(id) {
  const note = await Note.findByIdAndDelete(id).lean();
  if (!note) throw new ApiError(404, 'Note not found');
  return note;
}

export async function setNoteFile(id, { fileKey, fileName, fileType, fileSizeBytes }) {
  const note = await Note.findByIdAndUpdate(
    id,
    { $set: { source: 'upload', fileKey, fileName, fileType, fileSizeBytes }, $unset: { driveUrl: '' } },
    { new: true }
  ).lean();
  if (!note) throw new ApiError(404, 'Note not found');
  return note;
}

/**
 * Alternative to setNoteFile — points the note at a file the mentor already
 * hosts on Google Drive instead of uploading it to our own server. Clears
 * any previously-uploaded file's metadata so a note only ever has one
 * active source at a time.
 */
export async function setNoteDriveLink(id, driveUrl) {
  if (!driveUrl?.trim()) throw new ApiError(400, 'Drive URL is required');
  const note = await Note.findByIdAndUpdate(
    id,
    { $set: { source: 'drive', driveUrl: driveUrl.trim() }, $unset: { fileKey: '', fileName: '', fileType: '', fileSizeBytes: '' } },
    { new: true }
  ).lean();
  if (!note) throw new ApiError(404, 'Note not found');
  return note;
}

/** Replaces courseIds wholesale — mirrors assignWorksheetToCourses, minus usage history (not requested for notes). */
export async function assignNoteToCourses(id, courseIds) {
  const note = await Note.findByIdAndUpdate(id, { courseIds: courseIds || [] }, { new: true, runValidators: true })
    .populate('courseIds', 'title track')
    .populate('batchIds', 'name')
    .lean();
  if (!note) throw new ApiError(404, 'Note not found');
  return note;
}

/** Replaces batchIds wholesale — independent of assignNoteToCourses. */
export async function assignNoteToBatches(id, batchIds) {
  const note = await Note.findByIdAndUpdate(id, { batchIds: batchIds || [] }, { new: true, runValidators: true })
    .populate('courseIds', 'title track')
    .populate('batchIds', 'name')
    .lean();
  if (!note) throw new ApiError(404, 'Note not found');
  return note;
}

/**
 * Resolves the absolute path for streaming a note's file, after checking
 * the requester is allowed to access it: free notes are open to any
 * authenticated user (subject to course/batch targeting, if any); premium
 * notes additionally require the mentor role or a paid Purchase record.
 */
export async function resolveNoteFileForDownload(id, user) {
  const note = await Note.findById(id).lean();
  if (!note) throw new ApiError(404, 'Note not found');
  if (note.source !== 'drive' && !note.fileKey) throw new ApiError(404, 'This note has no file uploaded yet');
  if (note.source === 'drive' && !note.driveUrl) throw new ApiError(404, 'This note has no file uploaded yet');

  if (user.role === 'student') {
    if (!(await hasStudentAccess(user.id, 'notes'))) {
      throw new ApiError(403, 'Notes access has been restricted for your account');
    }
    if (!(await isNoteEligibleForStudent(note, user.id))) {
      throw new ApiError(403, 'This note is not available for your enrolled courses or batch');
    }
  }

  if (note.category === 'premium' && user.role !== 'mentor' && user.role !== 'admin') {
    const purchased = await hasPurchased(user.id, 'note', id);
    if (!purchased) throw new ApiError(403, 'Purchase required to download this note');
  }

  if (note.source === 'drive') return { redirectUrl: note.driveUrl };

  return {
    absolutePath: path.join(SECURE_UPLOADS_ROOT, 'notes', note.fileKey),
    fileName: note.fileName || note.fileKey,
    fileType: note.fileType || 'application/octet-stream',
  };
}

/**
 * Public (no-auth) download path for the homepage's free-downloads
 * section — deliberately narrower than resolveNoteFileForDownload: it only
 * ever serves notes explicitly marked 'free', regardless of who's asking.
 */
export async function resolveFreeNoteFileForDownload(id) {
  const note = await Note.findById(id).lean();
  if (!note) throw new ApiError(404, 'Note not found');
  if (note.category !== 'free') throw new ApiError(403, 'This note is not publicly downloadable');
  if ((note.courseIds?.length || 0) > 0 || (note.batchIds?.length || 0) > 0) {
    throw new ApiError(403, 'This note is not publicly downloadable');
  }
  if (note.source !== 'drive' && !note.fileKey) throw new ApiError(404, 'This note has no file uploaded yet');
  if (note.source === 'drive' && !note.driveUrl) throw new ApiError(404, 'This note has no file uploaded yet');

  if (note.source === 'drive') return { redirectUrl: note.driveUrl };

  return {
    absolutePath: path.join(SECURE_UPLOADS_ROOT, 'notes', note.fileKey),
    fileName: note.fileName || note.fileKey,
    fileType: note.fileType || 'application/octet-stream',
  };
}
