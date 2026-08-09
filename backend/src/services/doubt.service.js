import Doubt from '../models/Doubt.js';
import WorksheetProgress from '../models/WorksheetProgress.js';
import { ApiError } from '../utils/ApiError.js';

export async function createDoubt(studentId, { courseId, worksheetId, questionText, questionImageUrl }) {
  if (!questionText && !questionImageUrl) {
    throw new ApiError(400, 'A doubt needs text, an image, or both');
  }
  const doubt = await Doubt.create({
    studentId,
    courseId: courseId || undefined,
    worksheetId: worksheetId || undefined,
    questionText,
    questionImageUrl,
  });

  if (worksheetId) {
    await WorksheetProgress.findOneAndUpdate(
      { worksheetId, studentId },
      { $set: { doubtId: doubt._id } },
      { upsert: true }
    );
  }

  return doubt.toObject();
}

export async function getMyDoubts(studentId) {
  return Doubt.find({ studentId }).sort({ createdAt: -1 }).lean();
}

export async function getAllDoubts({ status } = {}) {
  const filter = status ? { status } : {};
  return Doubt.find(filter)
    .populate('studentId', 'name email')
    .populate('courseId', 'title')
    .populate('worksheetId', 'title')
    .sort({ status: 1, createdAt: -1 })
    .lean();
}

export async function answerDoubt(id, { answerText, answerImageUrl }) {
  if (!answerText && !answerImageUrl) {
    throw new ApiError(400, 'An answer needs text, an image, or both');
  }
  const doubt = await Doubt.findByIdAndUpdate(
    id,
    { answerText, answerImageUrl, status: 'answered', answeredAt: new Date() },
    { new: true }
  ).lean();
  if (!doubt) throw new ApiError(404, 'Doubt not found');
  return doubt;
}

export async function closeDoubt(id) {
  const doubt = await Doubt.findByIdAndUpdate(id, { status: 'closed' }, { new: true }).lean();
  if (!doubt) throw new ApiError(404, 'Doubt not found');
  return doubt;
}

/** Student-side "I understood the answer" — only valid once the mentor has answered. */
export async function markDoubtCleared(id, studentId) {
  const doubt = await Doubt.findOne({ _id: id, studentId });
  if (!doubt) throw new ApiError(404, 'Doubt not found');
  if (doubt.status !== 'answered') {
    throw new ApiError(400, 'Only an answered doubt can be marked understood');
  }
  doubt.status = 'cleared';
  await doubt.save();
  return doubt.toObject();
}

/**
 * Student-side delete — only allowed while the doubt is still 'open'
 * (unanswered). Once a mentor has put in the work to answer it, the record
 * stays for both sides regardless of what the student does with it next.
 */
export async function deleteDoubt(id, studentId) {
  const doubt = await Doubt.findOne({ _id: id, studentId }).lean();
  if (!doubt) throw new ApiError(404, 'Doubt not found');
  if (doubt.status !== 'open') {
    throw new ApiError(403, 'This doubt has already been answered and can no longer be deleted');
  }
  await Doubt.deleteOne({ _id: id });
  return doubt;
}
