import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import Note from '../models/Note.js';
import Test from '../models/Test.js';
import TestAttempt from '../models/TestAttempt.js';
import Purchase from '../models/Purchase.js';

const LEVEL_ORDER = ['Beginner', 'Intermediate', 'Advanced'];

/**
 * Pure rule-based recommender — no external AI call. Looks at the
 * student's most advanced active/completed enrollment to infer a track and
 * level, then suggests: the next-tier course in that track, unpurchased
 * notes in that track (free to download, premium to buy), and an
 * unattempted test in that track.
 */
export async function getRecommendationsForStudent(studentId) {
  const enrollments = await Enrollment.find({ studentId, status: { $in: ['active', 'completed'] } })
    .populate('courseId')
    .sort({ progressPercent: -1 })
    .lean();

  const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId?._id?.toString()).filter(Boolean));
  const primary = enrollments[0];
  const track = primary?.courseId?.track || null;
  const level = primary?.courseId?.level || 'Beginner';

  const baseExclusion = { status: 'open', _id: { $nin: [...enrolledCourseIds] } };
  let suggestedCourses = [];
  let stayedOnTrack = false;

  if (track) {
    const nextLevelIndex = Math.min(LEVEL_ORDER.indexOf(level) + 1, LEVEL_ORDER.length - 1);
    const nextLevel = LEVEL_ORDER[nextLevelIndex];
    // Prefer same-track + next-level tier, then any other same-track course,
    // before ever falling back across tracks — a NEET student should never
    // be steered toward a JEE course just because nothing else matched.
    suggestedCourses = await Course.find({ ...baseExclusion, track, level: nextLevel }).limit(3).lean();
    if (suggestedCourses.length === 0) {
      suggestedCourses = await Course.find({ ...baseExclusion, track }).limit(3).lean();
    }
    stayedOnTrack = suggestedCourses.length > 0;
  }
  if (suggestedCourses.length === 0) {
    suggestedCourses = await Course.find(baseExclusion).sort({ isFeatured: -1 }).limit(3).lean();
  }

  const paidNotePurchases = await Purchase.find({ studentId, itemType: 'note', status: 'paid' }).lean();
  const purchasedNoteIds = new Set(paidNotePurchases.map((p) => p.itemId.toString()));
  const noteFilter = track ? { track } : {};
  const candidateNotes = await Note.find(noteFilter).sort({ createdAt: -1 }).limit(20).lean();
  const suggestedNotes = candidateNotes
    .filter((n) => n.category === 'free' || !purchasedNoteIds.has(n._id.toString()))
    .slice(0, 4);

  const myAttempts = await TestAttempt.find({ studentId }).select('testId').lean();
  const attemptedTestIds = new Set(myAttempts.map((a) => a.testId.toString()));
  const testFilter = { status: 'published', _id: { $nin: [...attemptedTestIds] } };
  if (track) testFilter.examType = track;
  const suggestedTests = await Test.find(testFilter).select('-questions').limit(3).lean();

  const message = !primary
    ? "You haven't started a course yet — here are a few good places to begin."
    : stayedOnTrack
      ? `You're ${primary.progressPercent}% through "${primary.courseId.title}". Here's what should come next to keep your ${trackLabel(track)} prep on track.`
      : `You're ${primary.progressPercent}% through "${primary.courseId.title}". We don't have another ${trackLabel(track)} course open right now, but here's what else might interest you.`;

  return { message, suggestedCourses, suggestedNotes, suggestedTests };
}

function trackLabel(track) {
  const labels = {
    'jee-main': 'JEE Main',
    'jee-advanced': 'JEE Advanced',
    neet: 'NEET',
    olympiad: 'Olympiad',
    foundation: 'Foundation',
    'crash-course': 'crash-course',
  };
  return labels[track] || track;
}
