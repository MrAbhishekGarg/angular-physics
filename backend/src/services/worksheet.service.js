import path from 'path';
import Worksheet from '../models/Worksheet.js';
import WorksheetProgress from '../models/WorksheetProgress.js';
import Enrollment from '../models/Enrollment.js';
import { ApiError } from '../utils/ApiError.js';
import { SECURE_UPLOADS_ROOT } from '../middleware/upload.js';

const ACTIVE_STATUSES = ['active', 'completed'];

async function getEligibleCourseIds(studentId) {
  const enrollments = await Enrollment.find({ studentId, status: { $in: ACTIVE_STATUSES } }).lean();
  return enrollments.map((e) => e.courseId.toString());
}

export async function getAllWorksheets({ type, examType } = {}) {
  const filter = {};
  if (type) filter.type = type;
  if (examType) filter.examType = examType;
  return Worksheet.find(filter).populate('courseIds', 'title track').sort({ createdAt: -1 }).lean();
}

export async function getWorksheetById(id) {
  const worksheet = await Worksheet.findById(id).populate('courseIds', 'title track').lean();
  if (!worksheet) throw new ApiError(404, 'Worksheet not found');
  return worksheet;
}

export async function createWorksheet(payload) {
  const worksheet = await Worksheet.create(payload);
  return worksheet.toObject();
}

export async function updateWorksheet(id, payload) {
  const worksheet = await Worksheet.findByIdAndUpdate(id, payload, { new: true, runValidators: true }).lean();
  if (!worksheet) throw new ApiError(404, 'Worksheet not found');
  return worksheet;
}

export async function deleteWorksheet(id) {
  const worksheet = await Worksheet.findByIdAndDelete(id).lean();
  if (!worksheet) throw new ApiError(404, 'Worksheet not found');
  return worksheet;
}

export async function setWorksheetFile(id, { fileKey, fileName, fileSizeBytes }) {
  const worksheet = await Worksheet.findByIdAndUpdate(id, { fileKey, fileName, fileSizeBytes }, { new: true }).lean();
  if (!worksheet) throw new ApiError(404, 'Worksheet not found');
  return worksheet;
}

/**
 * Replaces courseIds and appends a usageHistory entry for every course
 * newly added — existing history entries are never removed, even when a
 * course is later dropped from courseIds, so past usage stays visible.
 */
export async function assignWorksheetToCourses(id, courseIds) {
  const worksheet = await Worksheet.findById(id);
  if (!worksheet) throw new ApiError(404, 'Worksheet not found');

  const previousIds = new Set(worksheet.courseIds.map((c) => c.toString()));
  const newlyAdded = courseIds.filter((cid) => !previousIds.has(cid));

  worksheet.courseIds = courseIds;
  newlyAdded.forEach((courseId) => worksheet.usageHistory.push({ courseId, assignedAt: new Date() }));

  await worksheet.save();
  return worksheet.toObject();
}

export async function getAvailableWorksheetsForStudent(studentId) {
  const courseIds = await getEligibleCourseIds(studentId);
  const worksheets = await Worksheet.find({ courseIds: { $in: courseIds } })
    .populate('courseIds', 'title track')
    .sort({ createdAt: -1 })
    .lean();

  const progress = await WorksheetProgress.find({
    studentId,
    worksheetId: { $in: worksheets.map((w) => w._id) },
  }).lean();
  const progressByWorksheet = new Map(progress.map((p) => [p.worksheetId.toString(), p]));

  return worksheets.map((w) => {
    const p = progressByWorksheet.get(w._id.toString());
    return { ...w, myProgress: { downloadedAt: p?.downloadedAt || null, completedAt: p?.completedAt || null } };
  });
}

export async function markWorksheetDownloaded(worksheetId, studentId) {
  await WorksheetProgress.findOneAndUpdate(
    { worksheetId, studentId },
    { $set: { downloadedAt: new Date() } },
    { upsert: true }
  );
}

export async function markWorksheetCompleted(worksheetId, studentId) {
  const worksheet = await Worksheet.findById(worksheetId).lean();
  if (!worksheet) throw new ApiError(404, 'Worksheet not found');
  if (worksheet.deadlineAt && worksheet.deadlineAt < new Date()) {
    throw new ApiError(403, 'The deadline for this worksheet has passed');
  }

  const existing = await WorksheetProgress.findOne({ worksheetId, studentId }).lean();
  if (!existing?.downloadedAt) {
    throw new ApiError(400, 'Download the worksheet before marking it complete');
  }
  const progress = await WorksheetProgress.findOneAndUpdate(
    { worksheetId, studentId },
    { $set: { completedAt: new Date() } },
    { new: true }
  ).lean();
  return progress;
}

/**
 * Per-student status for one worksheet, for the mentor's dashboard —
 * resolves "eligible students" from the worksheet's assigned courseIds
 * (mirrors getEligibleCourseIds, inverted: courseIds -> studentIds) and
 * left-joins WorksheetProgress so students who haven't interacted with it
 * yet still show up as "not downloaded".
 */
export async function getWorksheetProgressForMentor(worksheetId) {
  const worksheet = await Worksheet.findById(worksheetId).lean();
  if (!worksheet) throw new ApiError(404, 'Worksheet not found');

  const enrollments = await Enrollment.find({
    courseId: { $in: worksheet.courseIds },
    status: { $in: ACTIVE_STATUSES },
  })
    .populate('studentId', 'name email')
    .lean();

  const studentById = new Map();
  enrollments.forEach((e) => {
    if (e.studentId) studentById.set(e.studentId._id.toString(), e.studentId);
  });

  const progress = await WorksheetProgress.find({ worksheetId })
    .populate('doubtId', 'status')
    .lean();
  const progressByStudent = new Map(progress.map((p) => [p.studentId.toString(), p]));

  return [...studentById.values()].map((student) => {
    const p = progressByStudent.get(student._id.toString());
    return {
      studentId: student._id,
      name: student.name,
      email: student.email,
      downloadedAt: p?.downloadedAt || null,
      completedAt: p?.completedAt || null,
      doubtStatus: p?.doubtId?.status || null,
    };
  });
}

export async function resolveWorksheetFileForDownload(id, user) {
  const worksheet = await Worksheet.findById(id).lean();
  if (!worksheet) throw new ApiError(404, 'Worksheet not found');
  if (!worksheet.fileKey) throw new ApiError(404, 'This worksheet has no file uploaded yet');

  if (user.role !== 'mentor' && user.role !== 'admin') {
    const courseIds = await getEligibleCourseIds(user.id);
    const assigned = (worksheet.courseIds || []).map((cid) => cid.toString());
    const eligible = assigned.some((cid) => courseIds.includes(cid));
    if (!eligible) throw new ApiError(403, 'This worksheet is not available for your enrolled courses');
    if (worksheet.deadlineAt && worksheet.deadlineAt < new Date()) {
      throw new ApiError(403, 'The deadline for downloading this worksheet has passed');
    }
  }

  return {
    absolutePath: path.join(SECURE_UPLOADS_ROOT, 'worksheets', worksheet.fileKey),
    fileName: worksheet.fileName || worksheet.fileKey,
  };
}
