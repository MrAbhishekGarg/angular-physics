import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Lead from '../models/Lead.js';
import Testimonial from '../models/Testimonial.js';
import Note from '../models/Note.js';
import Video from '../models/Video.js';
import Test from '../models/Test.js';
import Worksheet from '../models/Worksheet.js';
import Purchase from '../models/Purchase.js';
import Question from '../models/Question.js';
import Doubt from '../models/Doubt.js';
import TestAttempt from '../models/TestAttempt.js';
import { gradeQuestion } from './test.service.js';

const NEW_CONTENT_WINDOW_DAYS = 7;
const NEW_CONTENT_LIMIT = 10;
const ACTIVE_ENROLLMENT_STATUSES = ['active', 'completed'];

/**
 * "New for You" feed for the student dashboard — live-computed from
 * createdAt, not a stored/read-tracked notification system: anything added
 * to the student's active-enrollment courses in the last 7 days shows up,
 * nothing to mark as read or dismiss.
 */
async function getNewContentForStudent(studentId) {
  const enrollments = await Enrollment.find({ studentId, status: { $in: ACTIVE_ENROLLMENT_STATUSES } }).lean();
  const courseIds = enrollments.map((e) => e.courseId);
  if (courseIds.length === 0) return [];

  const cutoff = new Date(Date.now() - NEW_CONTENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [tests, worksheets, videos, notes] = await Promise.all([
    Test.find({ status: 'published', kind: { $ne: 'practice' }, courseIds: { $in: courseIds }, createdAt: { $gte: cutoff } })
      .select('title createdAt')
      .lean(),
    Worksheet.find({ courseIds: { $in: courseIds }, createdAt: { $gte: cutoff } })
      .select('title type createdAt')
      .lean(),
    Video.find({ status: 'published', courseId: { $in: courseIds }, createdAt: { $gte: cutoff } })
      .select('title courseId createdAt')
      .lean(),
    Note.find({ $or: [{ courseId: { $in: courseIds } }, { courseId: null }], createdAt: { $gte: cutoff } })
      .select('title createdAt')
      .lean(),
  ]);

  // Tests are the one content type with a meaningful "already actioned"
  // state — tag each recent test with whether this student has already
  // submitted it, so the feed reflects reality instead of calling it "new"
  // forever within the 7-day window.
  const submittedAttempts = tests.length
    ? await TestAttempt.find({
        studentId,
        testId: { $in: tests.map((t) => t._id) },
        status: 'submitted',
        archived: { $ne: true },
      })
        .select('testId')
        .lean()
    : [];
  const attemptedTestIds = new Set(submittedAttempts.map((a) => a.testId.toString()));

  const items = [
    ...tests.map((t) => ({
      type: 'test',
      title: t.title,
      createdAt: t.createdAt,
      link: '/dashboard/student/tests',
      attempted: attemptedTestIds.has(t._id.toString()),
    })),
    ...worksheets.map((w) => ({
      type: w.type === 'dpp' ? 'dpp' : 'assignment',
      title: w.title,
      createdAt: w.createdAt,
      link: '/dashboard/student/worksheets',
    })),
    ...videos.map((v) => ({
      type: 'video',
      title: v.title,
      createdAt: v.createdAt,
      link: `/dashboard/student/courses/${v.courseId}/learn`,
    })),
    ...notes.map((n) => ({
      type: 'note',
      title: n.title,
      createdAt: n.createdAt,
      link: '/dashboard/student/notes',
    })),
  ];

  return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, NEW_CONTENT_LIMIT);
}

export async function getMentorAnalytics() {
  const [
    totalStudentIds,
    totalEnrollments,
    pendingCount,
    enrollmentsByCourseRaw,
    revenueRaw,
    totalLeads,
    recentLeads,
    leadsOverTimeRaw,
    testimonialsCount,
    totalNotes,
    totalVideos,
    totalTests,
    contentRevenueRaw,
    totalQuestions,
    openDoubtsCount,
  ] = await Promise.all([
    Enrollment.distinct('studentId'),
    Enrollment.countDocuments(),
    Enrollment.countDocuments({ status: 'pending' }),
    Enrollment.aggregate([
      { $group: { _id: '$courseId', count: { $sum: 1 } } },
      { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'course' } },
      { $unwind: '$course' },
      { $project: { _id: 0, courseId: '$_id', title: '$course.title', track: '$course.track', count: 1 } },
    ]),
    Enrollment.aggregate([
      { $match: { status: { $in: ['active', 'completed'] } } },
      { $lookup: { from: 'courses', localField: 'courseId', foreignField: '_id', as: 'course' } },
      { $unwind: '$course' },
      { $group: { _id: null, total: { $sum: '$course.price' } } },
    ]),
    Lead.countDocuments(),
    Lead.find().sort({ createdAt: -1 }).limit(10).lean(),
    Lead.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Testimonial.countDocuments(),
    Note.countDocuments(),
    Video.countDocuments(),
    Test.countDocuments(),
    Purchase.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Question.countDocuments(),
    Doubt.countDocuments({ status: 'open' }),
  ]);

  const enrollmentsByTrack = Object.values(
    enrollmentsByCourseRaw.reduce((acc, row) => {
      acc[row.track] = acc[row.track] || { track: row.track, count: 0 };
      acc[row.track].count += row.count;
      return acc;
    }, {})
  );

  return {
    totalStudents: totalStudentIds.length,
    totalEnrollments,
    pendingCount,
    enrollmentsByCourse: enrollmentsByCourseRaw,
    enrollmentsByTrack,
    revenueEstimate: revenueRaw[0]?.total || 0,
    totalLeads,
    recentLeads,
    leadsOverTime: leadsOverTimeRaw.map((r) => ({ date: r._id, count: r.count })),
    testimonialsCount,
    totalCourses: await Course.countDocuments(),
    totalNotes,
    totalVideos,
    totalTests,
    contentRevenue: contentRevenueRaw[0]?.total || 0,
    totalQuestions,
    openDoubtsCount,
  };
}

export async function getStudentAnalytics(studentId, email) {
  const [enrollments, leadsSubmittedCount, newContent] = await Promise.all([
    Enrollment.find({ studentId })
      .populate('courseId', 'title slug track price durationWeeks status imageUrl')
      .sort({ createdAt: -1 })
      .lean(),
    Lead.countDocuments({ email }),
    getNewContentForStudent(studentId),
  ]);

  return {
    enrollments,
    enrolledCount: enrollments.length,
    activeCount: enrollments.filter((e) => e.status === 'active').length,
    completedCount: enrollments.filter((e) => e.status === 'completed').length,
    leadsSubmittedCount,
    newContent,
  };
}

/**
 * Per-student view for the mentor: enrollments, purchased premium notes,
 * every test attempt with scores, and a "weak chapters" breakdown derived
 * by re-grading each submitted attempt's answers against the bank (an
 * attempt only stores aggregate counts, not per-answer outcome, so this
 * reuses test.service.js's gradeQuestion rather than duplicating it).
 */
export async function getStudentDetailAnalytics(studentId) {
  const [enrollments, paidPurchases, activeAttempts, allAttempts] = await Promise.all([
    Enrollment.find({ studentId }).populate('courseId', 'title slug track').sort({ createdAt: -1 }).lean(),
    Purchase.find({ studentId, status: 'paid' }).lean(),
    TestAttempt.find({ studentId, archived: { $ne: true } })
      .populate('testId', 'title kind examType')
      .sort({ createdAt: -1 })
      .lean(),
    // Reset attempts are archived, not deleted — a count across all of them
    // (per test) tells a mentor how many times this student has actually
    // given a test, not just whether their current attempt is active.
    TestAttempt.find({ studentId }).select('testId').lean(),
  ]);

  const countByTest = new Map();
  allAttempts.forEach((a) => {
    const key = a.testId.toString();
    countByTest.set(key, (countByTest.get(key) || 0) + 1);
  });
  const attempts = activeAttempts.map((a) => ({ ...a, attemptCount: countByTest.get(a.testId._id.toString()) || 1 }));

  const purchasedNoteIds = paidPurchases.filter((p) => p.itemType === 'note').map((p) => p.itemId);
  const purchasedNotes = purchasedNoteIds.length
    ? await Note.find({ _id: { $in: purchasedNoteIds } }).select('title track category price currency').lean()
    : [];

  const submittedAttempts = attempts.filter((a) => a.status === 'submitted');
  const allQuestionIds = [
    ...new Set(
      submittedAttempts.flatMap((a) => a.answers.map((ans) => ans.questionId?.toString()).filter(Boolean))
    ),
  ];
  const questions = allQuestionIds.length ? await Question.find({ _id: { $in: allQuestionIds } }).lean() : [];
  const questionById = new Map(questions.map((q) => [q._id.toString(), q]));

  const chapterMistakes = new Map();
  submittedAttempts.forEach((attempt) => {
    attempt.answers.forEach((answer) => {
      const question = questionById.get(answer.questionId?.toString());
      if (!question) return;
      const { outcome } = gradeQuestion(question, answer);
      if (outcome !== 'wrong' && outcome !== 'partial') return;
      const chapter = question.chapter || 'Untagged';
      chapterMistakes.set(chapter, (chapterMistakes.get(chapter) || 0) + 1);
    });
  });

  const weakChapters = [...chapterMistakes.entries()]
    .map(([chapter, mistakes]) => ({ chapter, mistakes }))
    .sort((a, b) => b.mistakes - a.mistakes)
    .slice(0, 5);

  const averageScorePercent = submittedAttempts.length
    ? Math.round(
        (submittedAttempts.reduce((sum, a) => sum + (a.maxScore ? a.score / a.maxScore : 0), 0) /
          submittedAttempts.length) *
          100
      )
    : null;

  return { enrollments, purchasedNotes, attempts, testsAttemptedCount: submittedAttempts.length, averageScorePercent, weakChapters };
}
