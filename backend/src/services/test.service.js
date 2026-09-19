import mongoose from 'mongoose';
import Test from '../models/Test.js';
import TestAttempt from '../models/TestAttempt.js';
import Question from '../models/Question.js';
import Enrollment from '../models/Enrollment.js';
import { ApiError } from '../utils/ApiError.js';
import { hasPurchased } from './payment.service.js';
import { generateQuestionSet } from './question.service.js';
import { hasStudentAccess } from '../utils/studentAccess.js';
import { recordPracticeSession } from './practice.service.js';

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
  // Admin-managed per-student block, independent of enrollment status —
  // checked first so a restricted student sees zero available tests
  // rather than a filtered subset that might mislead them into thinking
  // it's an enrollment problem.
  if (!(await hasStudentAccess(studentId, 'tests'))) return [];
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
    if (!(await hasStudentAccess(studentId, 'tests'))) throw new ApiError(403, 'Test access has been restricted for your account');
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

  // Subjective questions have no auto-gradable answer — authoring/storage
  // only for now (see Question.js), never actually addable to a live test
  // (the bank picker filters them out), but graded as a harmless
  // always-unattempted no-op here as a defense-in-depth guard against one
  // ever slipping through some other path.
  if (question.type === 'subjective') return { outcome: 'unattempted', points: 0 };

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
  // Fallback to whatever the periodic autosave already persisted for a
  // question the final submit payload doesn't cover — a real bug once let a
  // stale client-side submit fire with an empty/incomplete answers array
  // (see TestAttempt.jsx's handleSubmitRef fix) and silently wipe a whole
  // exam's worth of already-autosaved answers. This merge means a submit
  // can only ADD to or match what's already saved, never erase it.
  const previouslySavedByIndex = new Map((attempt.answers || []).map((a) => [a.questionIndex, a]));

  let score = 0;
  let maxScore = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let unattemptedCount = 0;
  const gradedAnswers = [];

  questions.forEach((question, index) => {
    maxScore += question.marks || 0;
    const rawAnswer = answerByIndex.get(index) || previouslySavedByIndex.get(index);
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

  if (test.kind === 'practice') {
    // Best-effort gamification bookkeeping — must never be able to fail or
    // slow down a real submit, since this same function also handles every
    // proctored exam submission (see the exam-timeout bug this session
    // already fixed once). A failure here just means one session's XP is
    // lost, not a broken exam.
    recordPracticeSession(studentId, { correctCount, wrongCount, questionCount: questions.length }).catch(() => {});
  }

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
  attempt.lastPingAt = new Date();
  await attempt.save();
  return { saved: true };
}

// How stale a heartbeat can be before a student no longer counts as "online
// now" — generous relative to the ~15s ping interval so one missed beat
// (a brief network hiccup) doesn't flicker a student in and out of the list.
const LIVE_WINDOW_MS = 45 * 1000;

/**
 * Lightweight heartbeat, independent of answer autosave — a student who's
 * just reading a question without changing an answer wouldn't otherwise
 * trigger any request for a while, which would make them look "offline"
 * even mid-exam. Called on its own timer from the exam screen.
 */
export async function pingAttempt(attemptId, studentId) {
  const attempt = await TestAttempt.findById(attemptId).select('studentId status');
  if (!attempt) throw new ApiError(404, 'Attempt not found');
  if (attempt.studentId.toString() !== studentId) throw new ApiError(403, 'Not your attempt');
  if (attempt.status !== 'in-progress') return { pinged: false };
  await TestAttempt.updateOne({ _id: attemptId }, { $set: { lastPingAt: new Date() } });
  return { pinged: true };
}

/** Students actively taking this specific test right now, for the mentor's live view. */
export async function getLiveAttemptsForTest(testId) {
  const since = new Date(Date.now() - LIVE_WINDOW_MS);
  const attempts = await TestAttempt.find({
    testId,
    status: 'in-progress',
    isPreview: { $ne: true },
    lastPingAt: { $gte: since },
  })
    .populate('studentId', 'name email')
    .select('studentId startedAt lastPingAt')
    .sort({ lastPingAt: -1 })
    .lean();
  return attempts.map((a) => ({ studentId: a.studentId._id, name: a.studentId.name, email: a.studentId.email, startedAt: a.startedAt }));
}

/** Per-test online-right-now counts across every test a mentor can see — for a badge on the Manage Tests list. */
export async function getLiveSummaryForAllTests() {
  const since = new Date(Date.now() - LIVE_WINDOW_MS);
  const rows = await TestAttempt.aggregate([
    { $match: { status: 'in-progress', isPreview: { $ne: true }, lastPingAt: { $gte: since } } },
    { $group: { _id: '$testId', count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id.toString(), r.count]));
}

/**
 * Every attempt for this test — including archived (reset) ones. A reset
 * only archives an attempt, it never deletes it (see resetAttempt below),
 * so a mentor/admin reviewing a student's history needs to see EVERY past
 * attempt's own full score/mistakes, not just whichever one is currently
 * active. Each row carries `attemptNumber` (1 = oldest) and `isCurrent`
 * (the one non-archived attempt, if any) so the UI can label them clearly
 * without hiding anything.
 */
export async function getAttemptsForTest(testId) {
  const rawAttempts = await TestAttempt.find({ testId, isPreview: { $ne: true } })
    .populate('studentId', 'name email')
    .sort({ createdAt: 1 })
    .lean();
  // A deleted student account leaves studentId un-populatable (null) — drop
  // just that attempt rather than letting one orphaned ref 500 the whole
  // results page for every other student.
  const attempts = rawAttempts.filter((a) => a.studentId);

  const countByStudent = new Map();
  attempts.forEach((a) => {
    const key = a.studentId._id.toString();
    countByStudent.set(key, (countByStudent.get(key) || 0) + 1);
  });

  const seenByStudent = new Map();
  return attempts
    .map((a) => {
      const key = a.studentId._id.toString();
      const attemptNumber = (seenByStudent.get(key) || 0) + 1;
      seenByStudent.set(key, attemptNumber);
      return { ...a, attemptNumber, attemptCount: countByStudent.get(key) || 1, isCurrent: !a.archived };
    })
    .sort((a, b) => {
      // Group by student (by name, for a stable readable order), most
      // recent attempt first within each student.
      const nameCompare = (a.studentId.name || '').localeCompare(b.studentId.name || '');
      if (nameCompare !== 0) return nameCompare;
      return b.attemptNumber - a.attemptNumber;
    });
}

/**
 * Permanently deletes one attempt's data — unlike resetAttempt (which
 * archives, keeping history), this is real, irreversible deletion.
 * Admin-only (see test.routes.js) since a mentor should reach for "Reset"
 * (give a fresh attempt while keeping the old one for the record) in the
 * ordinary course of things; hard delete is for when the data itself
 * shouldn't exist (e.g. a test run purely to debug the exam software).
 */
export async function deleteAttempt(attemptId) {
  const deleted = await TestAttempt.findByIdAndDelete(attemptId).lean();
  if (!deleted) throw new ApiError(404, 'Attempt not found');
  return deleted;
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

function median(sortedValues) {
  const n = sortedValues.length;
  if (n === 0) return null;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sortedValues[mid - 1] + sortedValues[mid]) / 2 : sortedValues[mid];
}

const SCORE_BUCKETS = [
  { label: '0-20%', min: 0, max: 20 },
  { label: '20-40%', min: 20, max: 40 },
  { label: '40-60%', min: 40, max: 60 },
  { label: '60-80%', min: 60, max: 80 },
  { label: '80-100%', min: 80, max: 100 },
];

/**
 * Full statistical report for one test — score distribution/average/
 * median, chapter-wise accuracy across everyone who took it, and a
 * per-option pick distribution per question (which wrong options students
 * actually gravitate toward, not just "correct vs wrong"). All computed
 * from the same submitted/non-archived/non-preview attempt set used
 * elsewhere in this file, and the same gradeQuestion() used everywhere
 * else so the numbers can never drift from how attempts are actually
 * scored.
 */
export async function getTestStatistics(testId) {
  const test = await Test.findById(testId).lean();
  if (!test) throw new ApiError(404, 'Test not found');
  const questions = await resolveQuestions(test.questionIds);

  const attempts = await TestAttempt.find({
    testId,
    status: 'submitted',
    archived: { $ne: true },
    isPreview: { $ne: true },
  }).lean();

  const scorePercents = attempts
    .filter((a) => a.maxScore > 0)
    .map((a) => (a.score / a.maxScore) * 100)
    .sort((a, b) => a - b);

  const summary = scorePercents.length
    ? {
        count: scorePercents.length,
        average: Math.round((scorePercents.reduce((s, v) => s + v, 0) / scorePercents.length) * 10) / 10,
        median: Math.round(median(scorePercents) * 10) / 10,
        highest: Math.round(scorePercents[scorePercents.length - 1] * 10) / 10,
        lowest: Math.round(scorePercents[0] * 10) / 10,
      }
    : null;

  const distribution = SCORE_BUCKETS.map((b) => ({
    label: b.label,
    count: scorePercents.filter((p) => (b.max === 100 ? p >= b.min && p <= b.max : p >= b.min && p < b.max)).length,
  }));

  const chapterStats = new Map();
  const optionDistribution = questions.map((q, index) => {
    const chapter = q.chapter || 'Untagged';
    if (!chapterStats.has(chapter)) chapterStats.set(chapter, { correct: 0, total: 0 });
    const chapterStat = chapterStats.get(chapter);

    const counts = (q.options || []).map(() => 0);
    let unattemptedCount = 0;
    attempts.forEach((a) => {
      const answer = a.answers.find((x) => x.questionIndex === index);
      const { outcome } = gradeQuestion(q, answer);
      if (outcome !== 'unattempted') {
        chapterStat.total += 1;
        if (outcome === 'correct' || outcome === 'partial') chapterStat.correct += 1;
      }
      if (!answer?.selectedOptionIndexes?.length) {
        unattemptedCount += 1;
        return;
      }
      answer.selectedOptionIndexes.forEach((oi) => {
        if (counts[oi] !== undefined) counts[oi] += 1;
      });
    });

    return {
      questionIndex: index,
      text: q.text,
      type: q.type,
      correctOptionIndexes: q.correctOptionIndexes || [],
      optionCounts: counts,
      unattemptedCount,
    };
  });

  const chapterBreakdown = [...chapterStats.entries()]
    .map(([chapter, s]) => ({
      chapter,
      attempted: s.total,
      accuracyPercent: s.total > 0 ? Math.round((s.correct / s.total) * 100) : null,
    }))
    .sort((a, b) => (a.accuracyPercent ?? 101) - (b.accuracyPercent ?? 101));

  return { summary, distribution, chapterBreakdown, optionDistribution, totalSubmitted: attempts.length };
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
export async function createPracticeTest(studentId, { examType, chapter, topic, difficulty, isPYQ, year, author, type, count }) {
  if (!(await hasStudentAccess(studentId, 'tests'))) throw new ApiError(403, 'Test access has been restricted for your account');
  const questions = await generateQuestionSet({ examType, chapter, topic, difficulty, isPYQ, year, author, type, count });

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
