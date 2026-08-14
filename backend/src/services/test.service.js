import mongoose from 'mongoose';
import Test from '../models/Test.js';
import TestAttempt from '../models/TestAttempt.js';
import Question from '../models/Question.js';
import Enrollment from '../models/Enrollment.js';
import { ApiError } from '../utils/ApiError.js';
import { hasPurchased } from './payment.service.js';
import { generateQuestionSet } from './question.service.js';

const ACTIVE_STATUSES = ['active', 'completed'];

function stripAnswers(question) {
  const { correctOptionIndexes, correctNumericAnswer, ...safe } = question;
  return safe;
}

function sanitizeTest(test) {
  return { ...test, questions: (test.questions || []).map(stripAnswers) };
}

/**
 * Resolves a Test's questionIds to the full bank documents, in the same
 * order they were selected — Mongo's $in does not guarantee order, so this
 * remaps explicitly. Any id that no longer resolves (question was deleted
 * from the bank) is silently dropped rather than erroring the whole test.
 */
async function resolveQuestions(questionIds = []) {
  const docs = await Question.find({ _id: { $in: questionIds } }).lean();
  const byId = new Map(docs.map((d) => [d._id.toString(), d]));
  return questionIds.map((id) => byId.get(id.toString())).filter(Boolean);
}

/**
 * Resolves a test's questions AND, when sections exist, each section's
 * index range into that same flat list — done in one pass (not by resolving
 * the flat list and separately recomputing ranges from raw id counts) so a
 * deleted bank question silently dropped from a section can't desync the
 * ranges from the actual resolved questions array.
 */
async function resolveQuestionsWithSections(test) {
  if (!test.sections || test.sections.length === 0) {
    const questions = await resolveQuestions(test.questionIds);
    return { questions, sections: [] };
  }

  const allIds = test.sections.flatMap((s) => s.questionIds);
  const docs = await Question.find({ _id: { $in: allIds } }).lean();
  const byId = new Map(docs.map((d) => [d._id.toString(), d]));

  const questions = [];
  const sections = test.sections.map((s) => {
    const startIndex = questions.length;
    s.questionIds.forEach((id) => {
      const doc = byId.get(id.toString());
      if (doc) questions.push(doc);
    });
    const endIndex = questions.length - 1;
    return { name: s.name, instructions: s.instructions || '', startIndex, endIndex, count: endIndex - startIndex + 1 };
  });

  return { questions, sections };
}

async function getEligibleCourseIds(studentId) {
  const enrollments = await Enrollment.find({ studentId, status: { $in: ACTIVE_STATUSES } }).lean();
  return enrollments.map((e) => e.courseId.toString());
}

// ---- Mentor CRUD (full docs, including correct answers) ----

export async function getAllTestsForMentor() {
  return Test.find({ kind: { $ne: 'practice' } })
    .populate('courseIds', 'title track')
    .sort({ createdAt: -1 })
    .lean();
}

export async function getTestByIdForMentor(id) {
  const test = await Test.findById(id).populate('courseIds', 'title track').lean();
  if (!test) throw new ApiError(404, 'Test not found');
  const { questions, sections } = await resolveQuestionsWithSections(test);
  return { ...test, questions, sections };
}

/** Cheap lookup for the paid-content permission gate — avoids resolving the full test. */
export async function getTestPaidStatus(id) {
  const test = await Test.findById(id).select('isPaid').lean();
  if (!test) throw new ApiError(404, 'Test not found');
  return test;
}

// When sections are provided, questionIds is derived from them (the flat
// field stays authoritative for every existing consumer — see Test.js).
function withDerivedQuestionIds(payload) {
  if (!payload.sections || payload.sections.length === 0) return payload;
  return { ...payload, questionIds: payload.sections.flatMap((s) => s.questionIds) };
}

export async function createTest(payload) {
  const test = await Test.create(withDerivedQuestionIds(payload));
  return test.toObject();
}

export async function updateTest(id, payload) {
  const test = await Test.findByIdAndUpdate(id, withDerivedQuestionIds(payload), { new: true, runValidators: true }).lean();
  if (!test) throw new ApiError(404, 'Test not found');
  return test;
}

export async function deleteTest(id) {
  const test = await Test.findByIdAndDelete(id).lean();
  if (!test) throw new ApiError(404, 'Test not found');
  await TestAttempt.deleteMany({ testId: id });
  return test;
}

// ---- Student-facing ----

export async function getAvailableTestsForStudent(studentId) {
  const courseIds = await getEligibleCourseIds(studentId);
  const tests = await Test.find({
    status: 'published',
    kind: { $ne: 'practice' },
    courseIds: { $in: courseIds },
    $or: [{ liveUntil: null }, { liveUntil: { $gt: new Date() } }],
  })
    .populate('courseIds', 'title track')
    .sort({ createdAt: -1 })
    .lean();

  const attempts = await TestAttempt.find({
    studentId,
    testId: { $in: tests.map((t) => t._id) },
    archived: { $ne: true },
  })
    .select('testId status score maxScore')
    .lean();
  const attemptByTest = new Map(attempts.map((a) => [a.testId.toString(), a]));

  return tests.map((t) => ({ ...t, myAttempt: attemptByTest.get(t._id.toString()) || null }));
}

async function assertStudentEligible(studentId, test) {
  if (test.kind === 'practice') {
    if (test.studentId?.toString() !== studentId) throw new ApiError(403, 'This practice test is not yours');
    return;
  }

  const courseIds = await getEligibleCourseIds(studentId);
  const assigned = (test.courseIds || []).map((id) => id.toString());
  const eligible = assigned.some((id) => courseIds.includes(id));
  if (!eligible) throw new ApiError(403, 'This test is not available for your enrolled courses');

  if (test.isPaid) {
    const purchased = await hasPurchased(studentId, 'test', test._id);
    if (!purchased) throw new ApiError(402, 'Purchase required to attempt this test');
  }
}

export async function startAttempt(studentId, testId, role) {
  const test = await Test.findById(testId).lean();
  if (!test) throw new ApiError(404, 'Test not found');
  if (test.status !== 'published') throw new ApiError(400, 'This test is not published');

  const isMentorPreview = role === 'mentor' || role === 'admin';

  if (!isMentorPreview && test.liveUntil && test.liveUntil < new Date()) {
    throw new ApiError(400, 'This test is no longer live');
  }

  const existing = await TestAttempt.findOne({ testId, studentId, archived: { $ne: true } }).lean();
  if (existing) {
    if (existing.status === 'submitted') {
      // A mentor previewing their own test should be able to run it as many
      // times as they like (e.g. after editing it) — auto-archive the old
      // preview run and fall through to create a fresh one below. A student
      // hitting this on a real attempt is still a hard stop; only a mentor
      // resetting their own submitted attempt (see resetAttempt) clears it.
      if (isMentorPreview) {
        await TestAttempt.findByIdAndUpdate(existing._id, { archived: true });
      } else {
        throw new ApiError(409, 'You already attempted this test');
      }
    } else {
      const { questions, sections } = await resolveQuestionsWithSections(test);
      return { test: sanitizeTest({ ...test, questions, sections }), attempt: existing };
    }
  }

  // A mentor previewing their own test skips enrollment/payment eligibility
  // entirely — see the isPreview flag below, which keeps this run out of
  // attendance and getAttemptsForTest.
  if (!isMentorPreview) {
    await assertStudentEligible(studentId, test);
  }

  let attempt;
  try {
    attempt = await TestAttempt.create({
      testId,
      studentId,
      startedAt: new Date(),
      durationMinutes: test.durationMinutes,
      isPreview: isMentorPreview,
    });
    attempt = attempt.toObject();
  } catch (err) {
    // A concurrent start request (double-click, retry, React StrictMode's
    // double-effect in dev) can race here — both see no existing attempt
    // and both try to create one. Losing the race isn't a real error, so
    // fetch and resume the attempt the winner created instead of 500ing.
    if (err.code === 11000) {
      attempt = await TestAttempt.findOne({ testId, studentId, archived: { $ne: true } }).lean();
    } else {
      throw err;
    }
  }

  const { questions, sections } = await resolveQuestionsWithSections(test);
  return { test: sanitizeTest({ ...test, questions, sections }), attempt };
}

export function gradeQuestion(question, answer) {
  const marks = question.marks || 0;
  const negativeMarks = question.negativeMarks || 0;

  if (question.type === 'numerical') {
    if (answer?.numericAnswer === undefined || answer?.numericAnswer === null) {
      return { outcome: 'unattempted', points: 0 };
    }
    const diff = Math.abs(answer.numericAnswer - question.correctNumericAnswer);
    if (diff <= (question.numericTolerance || 0)) return { outcome: 'correct', points: marks };
    return { outcome: 'wrong', points: -negativeMarks };
  }

  const selected = answer?.selectedOptionIndexes || [];
  if (selected.length === 0) return { outcome: 'unattempted', points: 0 };

  const correct = new Set(question.correctOptionIndexes || []);
  const selectedSet = new Set(selected);
  const hasWrongSelection = selected.some((i) => !correct.has(i));

  if (hasWrongSelection) return { outcome: 'wrong', points: -negativeMarks };

  const isExactMatch = correct.size === selectedSet.size;
  if (isExactMatch) return { outcome: 'correct', points: marks };

  // mcq-multiple partial credit: correct subset selected, no wrong options.
  const partial = correct.size > 0 ? (selectedSet.size / correct.size) * marks : 0;
  return { outcome: 'partial', points: partial };
}

export async function submitAttempt(attemptId, studentId, { answers = [], proctoring = {} } = {}) {
  const attempt = await TestAttempt.findById(attemptId);
  if (!attempt) throw new ApiError(404, 'Attempt not found');
  if (attempt.studentId.toString() !== studentId) throw new ApiError(403, 'Not your attempt');
  if (attempt.status === 'submitted') throw new ApiError(409, 'This attempt was already submitted');

  const test = await Test.findById(attempt.testId).lean();
  if (!test) throw new ApiError(404, 'Test not found');
  const questions = await resolveQuestions(test.questionIds);

  const answerByIndex = new Map(answers.map((a) => [a.questionIndex, a]));

  let score = 0;
  let maxScore = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let unattemptedCount = 0;
  const gradedAnswers = [];

  questions.forEach((question, index) => {
    maxScore += question.marks || 0;
    const rawAnswer = answerByIndex.get(index);
    const { outcome, points } = gradeQuestion(question, rawAnswer);
    score += points;
    if (outcome === 'correct' || outcome === 'partial') correctCount += 1;
    else if (outcome === 'wrong') wrongCount += 1;
    else unattemptedCount += 1;

    gradedAnswers.push({
      questionIndex: index,
      questionId: question._id,
      selectedOptionIndexes: rawAnswer?.selectedOptionIndexes || [],
      numericAnswer: rawAnswer?.numericAnswer,
    });
  });

  const tabSwitchCount = proctoring.tabSwitchCount || 0;
  const blurCount = proctoring.blurCount || 0;
  const fullscreenExitCount = proctoring.fullscreenExitCount || 0;
  const flagged = tabSwitchCount > 3 || fullscreenExitCount > 2 || blurCount > 5;

  attempt.answers = gradedAnswers;
  attempt.status = 'submitted';
  attempt.submittedAt = new Date();
  attempt.score = Math.round(score * 100) / 100;
  attempt.maxScore = maxScore;
  attempt.correctCount = correctCount;
  attempt.wrongCount = wrongCount;
  attempt.unattemptedCount = unattemptedCount;
  attempt.proctoring = { tabSwitchCount, blurCount, fullscreenExitCount, flagged };

  await attempt.save();
  return attempt.toObject();
}

/**
 * Periodic autosave of in-progress answers, called from the client while
 * the student is still taking the test — not the final scored submit. This
 * is what lets a resumed attempt (after a power cut / closed tab) restore
 * the student's actual answers, not just the timer: without it,
 * `attempt.answers` would stay empty until a real submit, so startAttempt's
 * "resume the existing attempt" path would resume a blank answer sheet.
 */
export async function saveAttemptProgress(attemptId, studentId, answers = []) {
  const attempt = await TestAttempt.findById(attemptId);
  if (!attempt) throw new ApiError(404, 'Attempt not found');
  if (attempt.studentId.toString() !== studentId) throw new ApiError(403, 'Not your attempt');
  if (attempt.status === 'submitted') return { saved: false };

  attempt.answers = answers.map((a) => ({
    questionIndex: a.questionIndex,
    questionId: a.questionId,
    selectedOptionIndexes: a.selectedOptionIndexes || [],
    numericAnswer: a.numericAnswer,
  }));
  await attempt.save();
  return { saved: true };
}

export async function getAttemptsForTest(testId) {
  const attempts = await TestAttempt.find({ testId, isPreview: { $ne: true }, archived: { $ne: true } })
    .populate('studentId', 'name email')
    .sort({ score: -1, createdAt: -1 })
    .lean();

  // Reset attempts are archived, not deleted, so a full count (including
  // archived ones) tells a mentor how many times a student has actually
  // given this test, not just whether their current attempt is active.
  const allForTest = await TestAttempt.find({ testId, isPreview: { $ne: true } }).select('studentId').lean();
  const countByStudent = new Map();
  allForTest.forEach((a) => {
    const key = a.studentId.toString();
    countByStudent.set(key, (countByStudent.get(key) || 0) + 1);
  });

  return attempts.map((a) => ({ ...a, attemptCount: countByStudent.get(a.studentId._id.toString()) || 1 }));
}

/**
 * Per-student attendance for one test, for the mentor's dashboard — same
 * eligible-students-from-assigned-courses pattern as
 * worksheet.service.js's getWorksheetProgressForMentor, left-joined
 * against TestAttempt so students who never started still show up as
 * "not attempted" instead of being invisible. Excludes mentor preview runs.
 */
export async function getAttendanceForTest(testId) {
  const test = await Test.findById(testId).lean();
  if (!test) throw new ApiError(404, 'Test not found');

  const enrollments = await Enrollment.find({
    courseId: { $in: test.courseIds },
    status: { $in: ACTIVE_STATUSES },
  })
    .populate('studentId', 'name email')
    .lean();

  const studentById = new Map();
  enrollments.forEach((e) => {
    if (e.studentId) studentById.set(e.studentId._id.toString(), e.studentId);
  });

  const attempts = await TestAttempt.find({ testId, isPreview: { $ne: true }, archived: { $ne: true } }).lean();
  const attemptByStudent = new Map(attempts.map((a) => [a.studentId.toString(), a]));

  return [...studentById.values()].map((student) => {
    const a = attemptByStudent.get(student._id.toString());
    return {
      studentId: student._id,
      name: student.name,
      email: student.email,
      attempted: Boolean(a),
      status: a?.status || null,
      score: a?.status === 'submitted' ? a.score : null,
      maxScore: a?.status === 'submitted' ? a.maxScore : null,
    };
  });
}

/**
 * Platform-wide per-student test performance for the mentor's "All
 * Students" page — testsGiven/avgScorePercent from one aggregate over every
 * submitted, non-archived, non-preview attempt, then ranked by avg score
 * (1-based; only students with at least one submitted test get a rank).
 */
export async function getStudentTestStats({ studentIds } = {}) {
  const match = { status: 'submitted', archived: { $ne: true }, isPreview: { $ne: true } };
  // Unlike a plain Mongoose .find(), .aggregate() pipelines go to the driver
  // raw and don't auto-cast string ids — this cast is required or the
  // filter silently matches nothing.
  if (studentIds) {
    match.studentId = { $in: studentIds.map((id) => new mongoose.Types.ObjectId(id)) };
  }
  const rows = await TestAttempt.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$studentId',
        testsGiven: { $sum: 1 },
        avgScorePercent: {
          $avg: {
            $cond: [{ $gt: ['$maxScore', 0] }, { $multiply: [{ $divide: ['$score', '$maxScore'] }, 100] }, 0],
          },
        },
      },
    },
    { $sort: { avgScorePercent: -1 } },
  ]);

  return rows.map((r, index) => ({
    studentId: r._id.toString(),
    testsGiven: r.testsGiven,
    avgScorePercent: Math.round(r.avgScorePercent * 10) / 10,
    rank: index + 1,
  }));
}

/**
 * Per-question breakdown for the mentor's "Question Analysis" report —
 * attempted/correct/wrong counts and accuracy for every question in a test,
 * re-grading each submitted attempt's stored answer through the same
 * gradeQuestion() used by submitAttempt/getStudentDetailAnalytics rather
 * than duplicating the scoring logic.
 */
export async function getQuestionAnalysisForTest(testId) {
  const test = await Test.findById(testId).lean();
  if (!test) throw new ApiError(404, 'Test not found');
  const questions = await resolveQuestions(test.questionIds);

  const attempts = await TestAttempt.find({
    testId,
    status: 'submitted',
    archived: { $ne: true },
    isPreview: { $ne: true },
  }).lean();

  return questions.map((q, index) => {
    let attemptedCount = 0;
    let correctCount = 0;
    let wrongCount = 0;

    attempts.forEach((a) => {
      const answer = a.answers.find((x) => x.questionIndex === index);
      const { outcome } = gradeQuestion(q, answer);
      if (outcome !== 'unattempted') attemptedCount += 1;
      if (outcome === 'correct' || outcome === 'partial') correctCount += 1;
      if (outcome === 'wrong') wrongCount += 1;
    });

    return {
      questionIndex: index,
      text: q.text,
      totalStudents: attempts.length,
      attemptedCount,
      correctCount,
      wrongCount,
      accuracyPercent: attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : null,
    };
  });
}

export async function getMyAttempts(studentId) {
  return TestAttempt.find({ studentId })
    .populate('testId', 'title examType kind')
    .sort({ createdAt: -1 })
    .lean();
}

export async function getAttemptResult(attemptId, user) {
  const attempt = await TestAttempt.findById(attemptId).lean();
  if (!attempt) throw new ApiError(404, 'Attempt not found');
  if (user.role !== 'mentor' && user.role !== 'admin' && attempt.studentId.toString() !== user.id) {
    throw new ApiError(403, 'Not your attempt');
  }
  if (attempt.status !== 'submitted') throw new ApiError(400, 'Attempt not submitted yet');

  const test = await Test.findById(attempt.testId).lean();
  const { questions, sections } = await resolveQuestionsWithSections(test);

  // Rank among everyone who has actually taken this specific test — distinct
  // from the platform-wide "All Students" rank, which averages across every
  // test a student has ever taken.
  const allAttempts = await TestAttempt.find({
    testId: attempt.testId,
    status: 'submitted',
    archived: { $ne: true },
    isPreview: { $ne: true },
  })
    .select('_id score')
    .sort({ score: -1 })
    .lean();
  const rankIndex = allAttempts.findIndex((a) => a._id.toString() === attemptId);

  return {
    attempt,
    test: { ...test, questions, sections },
    rank: rankIndex === -1 ? null : rankIndex + 1,
    totalAttempts: allAttempts.length,
  };
}

/**
 * Lets a mentor let a student retake a test they've already submitted —
 * archives the current attempt (kept for history, no longer "active") so
 * startAttempt's partial-unique-index check allows a fresh one.
 */
export async function resetAttempt(attemptId) {
  const attempt = await TestAttempt.findByIdAndUpdate(attemptId, { archived: true }, { new: true }).lean();
  if (!attempt) throw new ApiError(404, 'Attempt not found');
  return attempt;
}

/**
 * Student self-serve topic/chapter-wise practice: samples matching bank
 * questions, spins up a private practice Test scoped to just this student
 * (isProctored:false, no course/payment gating), and immediately starts an
 * attempt — one round trip into the same TestAttempt flow already built.
 */
export async function createPracticeTest(studentId, { examType, chapter, topic, difficulty, isPYQ, year, count }) {
  const questions = await generateQuestionSet({ examType, chapter, topic, difficulty, isPYQ, year, count });

  const label = chapter || topic || examType;
  const pyqLabel = isPYQ ? ` PYQ${year ? ` ${year}` : ''}` : '';
  const test = await Test.create({
    title: `Practice:${pyqLabel} ${label}${difficulty ? ` (${difficulty})` : ''}`,
    examType,
    durationMinutes: Math.max(10, questions.length * 2),
    status: 'published',
    kind: 'practice',
    isProctored: false,
    studentId,
    questionIds: questions.map((q) => q._id),
  });

  return startAttempt(studentId, test._id.toString());
}
