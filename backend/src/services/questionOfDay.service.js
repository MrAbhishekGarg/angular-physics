import QuestionOfDay from '../models/QuestionOfDay.js';
import Question from '../models/Question.js';
import { ApiError } from '../utils/ApiError.js';
import { gradeQuestion } from './test.service.js';

function stripAnswers(question) {
  const { correctOptionIndexes, correctNumericAnswer, ...safe } = question;
  return safe;
}

async function getLiveQuestion() {
  const entry = await QuestionOfDay.findOne().sort({ setAt: -1 }).lean();
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
