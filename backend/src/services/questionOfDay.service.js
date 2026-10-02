import QuestionOfDay from '../models/QuestionOfDay.js';
import Question from '../models/Question.js';
import { ApiError } from '../utils/ApiError.js';
import { gradeQuestion } from './test.service.js';
import { istDateString } from '../utils/istDate.js';

// How many of the most recently used questions to avoid repeating — not a
// hard rule (a small bank can legitimately run out of fresh options), just
// a preference that falls back to any question rather than finding none.
const RECENT_REPEAT_WINDOW = 14;

function stripAnswers(question) {
  const { correctOptionIndexes, correctNumericAnswer, ...safe } = question;
  return safe;
}

async function pickRandomQuestion(excludeIds) {
  const [picked] = await Question.aggregate([
    { $match: { type: { $ne: 'subjective' }, _id: { $nin: excludeIds } } },
    { $sample: { size: 1 } },
  ]);
  return picked || null;
}

/**
 * Picks a new question once per IST calendar day so the widget changes on
 * its own — but a mentor's manual pick (setQuestionOfDay) also stamps
 * `setAt` as "now", so it reads as already-set-for-today here and is left
 * alone for the rest of that day rather than being immediately overwritten.
 */
async function ensureQuestionOfDayForToday() {
  const latest = await QuestionOfDay.findOne().sort({ setAt: -1 }).lean();
  const today = istDateString();
  if (latest && istDateString(latest.setAt) === today) return latest;

  const recent = await QuestionOfDay.find().sort({ setAt: -1 }).limit(RECENT_REPEAT_WINDOW).lean();
  const excludeIds = recent.map((r) => r.questionId);
  const picked = (await pickRandomQuestion(excludeIds)) || (await pickRandomQuestion([]));
  if (!picked) return latest || null; // bank is empty — nothing to rotate to

  const entry = await QuestionOfDay.create({ questionId: picked._id, setAt: new Date() });
  return entry.toObject();
}

async function getLiveQuestion() {
  const entry = await ensureQuestionOfDayForToday();
  if (!entry) return null;
  const question = await Question.findById(entry.questionId).lean();
  return question || null;
}

export async function getSanitizedQuestionOfDay() {
  const question = await getLiveQuestion();
  return question ? stripAnswers(question) : null;
}

/**
 * Grades server-side against the real question so the correct answer is
 * only ever revealed after the visitor submits a guess.
 */
export async function checkQuestionOfDay({ selectedOptionIndexes, numericAnswer }) {
  const question = await getLiveQuestion();
  if (!question) throw new ApiError(404, 'No question of the day is set right now');

  const result = gradeQuestion(question, { selectedOptionIndexes, numericAnswer });
  return {
    correct: result.outcome === 'correct',
    correctOptionIndexes: question.correctOptionIndexes,
    correctNumericAnswer: question.correctNumericAnswer,
  };
}

export async function setQuestionOfDay(questionId) {
  const question = await Question.findById(questionId).lean();
  if (!question) throw new ApiError(404, 'Question not found in the bank');
  const entry = await QuestionOfDay.create({ questionId, setAt: new Date() });
  return entry.toObject();
}
