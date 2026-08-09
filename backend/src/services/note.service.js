import path from 'path';
import Note from '../models/Note.js';
import { ApiError } from '../utils/ApiError.js';
import { hasPurchased } from './payment.service.js';
import { SECURE_UPLOADS_ROOT } from '../middleware/upload.js';

export async function getAllNotes({ track } = {}) {
  const filter = track ? { track } : {};
  return Note.find(filter).sort({ createdAt: -1 }).lean();
}

/** Public (no-auth) listing for the homepage's free-downloads section — free notes only. */
export async function getPublicFreeNotes() {
  return Note.find({ category: 'free', fileKey: { $exists: true, $ne: null } })
    .select('title description track fileName fileSizeBytes createdAt')
    .sort({ createdAt: -1 })
    .lean();
}

export async function getNoteById(id) {
  const note = await Note.findById(id).lean();
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
    { fileKey, fileName, fileType, fileSizeBytes },
    { new: true }
  ).lean();
  if (!note) throw new ApiError(404, 'Note not found');
  return note;
}

/**
 * Resolves the absolute path for streaming a note's file, after checking
 * the requester is allowed to access it: free notes are open to any
 * authenticated user; premium notes require the mentor role or a paid
 * Purchase record.
 */
export async function resolveNoteFileForDownload(id, user) {
  const note = await Note.findById(id).lean();
  if (!note) throw new ApiError(404, 'Note not found');
  if (!note.fileKey) throw new ApiError(404, 'This note has no file uploaded yet');

  if (note.category === 'premium' && user.role !== 'mentor' && user.role !== 'admin') {
    const purchased = await hasPurchased(user.id, 'note', id);
    if (!purchased) throw new ApiError(403, 'Purchase required to download this note');
  }

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
  if (!note.fileKey) throw new ApiError(404, 'This note has no file uploaded yet');

  return {
    absolutePath: path.join(SECURE_UPLOADS_ROOT, 'notes', note.fileKey),
    fileName: note.fileName || note.fileKey,
    fileType: note.fileType || 'application/octet-stream',
  };
}
