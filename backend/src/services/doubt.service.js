import Doubt from '../models/Doubt.js';
import Worksheet from '../models/Worksheet.js';
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

/**
 * `courseIds` scopes the listing for a course-restricted mentor — a doubt
 * counts as "from" a course either directly (courseId) or via a worksheet
 * assigned to that course (worksheetId), since a worksheet-tied doubt has
 * no courseId of its own.
 */
export async function getAllDoubts({ status, courseIds } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (courseIds) {
    const worksheets = await Worksheet.find({ courseIds: { $in: courseIds } }).select('_id').lean();
    filter.$or = [{ courseId: { $in: courseIds } }, { worksheetId: { $in: worksheets.map((w) => w._id) } }];
  }
  return Doubt.find(filter)
    .populate('studentId', 'name email')
    .populate('courseId', 'title')
    .populate('worksheetId', 'title')
    .sort({ status: 1, createdAt: -1 })
    .lean();
}

/** Resolves the course(s) a doubt belongs to — direct courseId, or (for a
 *  worksheet-tied doubt with no courseId of its own) the worksheet's courseIds. */
async function resolveDoubtCourseIds(doubt) {
  const ids = new Set();
  if (doubt.courseId) ids.add(doubt.courseId.toString());
  if (doubt.worksheetId) {
    const worksheet = await Worksheet.findById(doubt.worksheetId).select('courseIds').lean();
    (worksheet?.courseIds || []).forEach((cid) => ids.add(cid.toString()));
  }
  return [...ids];
}

/** Mirrors assertCourseAssigned, resolved async since a worksheet-tied
 *  doubt's course comes from the Worksheet, not the Doubt itself. */
async function assertMentorCanAccessDoubt(user, doubt) {
  if (user?.role !== 'mentor' || user.courseAccessMode !== 'selected') return;
  const doubtCourseIds = await resolveDoubtCourseIds(doubt);
  const allowed = doubtCourseIds.some((cid) => user.assignedCourseIds?.includes(cid));
  if (!allowed) throw new ApiError(403, 'Not authorized for this doubt');
}

export async function answerDoubt(id, { answerText, answerImageUrl }, user) {
  if (!answerText && !answerImageUrl) {
    throw new ApiError(400, 'An answer needs text, an image, or both');
  }
  const existing = await Doubt.findById(id).lean();
  if (!existing) throw new ApiError(404, 'Doubt not found');
  await assertMentorCanAccessDoubt(user, existing);
  const doubt = await Doubt.findByIdAndUpdate(
    id,
    { answerText, answerImageUrl, status: 'answered', answeredAt: new Date() },
    { new: true }
  ).lean();
  return doubt;
}

export async function closeDoubt(id, user) {
  const existing = await Doubt.findById(id).lean();
  if (!existing) throw new ApiError(404, 'Doubt not found');
  await assertMentorCanAccessDoubt(user, existing);
  const doubt = await Doubt.findByIdAndUpdate(id, { status: 'closed' }, { new: true }).lean();
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
