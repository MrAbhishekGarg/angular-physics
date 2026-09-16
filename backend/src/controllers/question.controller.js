import * as questionService from '../services/question.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

function parseTagsField(raw) {
  if (!raw) return [];
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export const listQuestions = asyncHandler(async (req, res) => {
  const { examType, chapter, topic, difficulty, search, isPYQ, author, tag, subject, conceptCode, includeUsage } = req.query;
  const questions = await questionService.getAllQuestions({
    examType,
    chapter,
    topic,
    difficulty,
    search,
    isPYQ: isPYQ ? isPYQ === 'true' : undefined,
    author,
    tag,
    subject,
    conceptCode,
    includeUsage: includeUsage === 'true',
  });
  return ApiResponse(res, 200, questions, { count: questions.length });
});

export const getTaxonomy = asyncHandler(async (req, res) => {
  const taxonomy = await questionService.getTaxonomy({ examType: req.query.examType });
  return ApiResponse(res, 200, taxonomy);
});

export const getQuestion = asyncHandler(async (req, res) => {
  const question = await questionService.getQuestionById(req.params.id);
  return ApiResponse(res, 200, question);
});

export const createQuestion = asyncHandler(async (req, res) => {
  const question = await questionService.createQuestion(req.body);
  return ApiResponse(res, 201, question);
});

export const updateQuestion = asyncHandler(async (req, res) => {
  const question = await questionService.updateQuestion(req.params.id, req.body);
  return ApiResponse(res, 200, question);
});

export const deleteQuestion = asyncHandler(async (req, res) => {
  await questionService.deleteQuestion(req.params.id);
  return ApiResponse(res, 200, { deleted: true });
});

export const bulkDeleteQuestions = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) throw new ApiError(400, 'ids must be a non-empty array');
  const result = await questionService.deleteQuestions(ids);
  return ApiResponse(res, 200, result);
});

export const bulkUploadQuestionsScreenshots = asyncHandler(async (req, res) => {
  const { examType, chapter, topic, difficulty, author, subject, tags } = req.body;

  const { questions, warnings } = await questionService.bulkCreateFromScreenshotsAndExcel(
    req.files.images,
    req.files.excel[0].buffer,
    {
      examType: examType || '',
      chapter: chapter || '',
      topic: topic || '',
      difficulty: difficulty || 'medium',
      author: author || '',
      subject: subject || '',
      tags: parseTagsField(tags),
    }
  );
  return ApiResponse(res, 200, { questions, warnings }, { created: questions.length, skipped: warnings.length });
});

export const bulkUploadQuestionsExcelScreenshots = asyncHandler(async (req, res) => {
  const { examType, chapter, topic, difficulty, author, subject, tags } = req.body;

  const { questions, warnings } = await questionService.bulkCreateFromExcelScreenshots(req.file.buffer, {
    examType: examType || '',
    chapter: chapter || '',
    topic: topic || '',
    difficulty: difficulty || 'medium',
    author: author || '',
    subject: subject || '',
    tags: parseTagsField(tags),
  });
  return ApiResponse(res, 200, { questions, warnings }, { created: questions.length, skipped: warnings.length });
});

export const bulkUploadQuestionsDocxScreenshots = asyncHandler(async (req, res) => {
  const { examType, chapter, topic, difficulty, author, subject, tags } = req.body;

  const { questions, warnings } = await questionService.bulkCreateFromDocxScreenshots(
    req.files.docx[0].buffer,
    req.files.excel[0].buffer,
    {
      examType: examType || '',
      chapter: chapter || '',
      topic: topic || '',
      difficulty: difficulty || 'medium',
      author: author || '',
      subject: subject || '',
      tags: parseTagsField(tags),
    }
  );
  return ApiResponse(res, 200, { questions, warnings }, { created: questions.length, skipped: warnings.length });
});

export const commitExtractedQuestions = asyncHandler(async (req, res) => {
  const { examType, chapter, topic, difficulty, author, subject, tags, questions: questionsRaw } = req.body;

  let extractedQuestions;
  try {
    extractedQuestions = JSON.parse(questionsRaw);
  } catch {
    throw new ApiError(400, 'The "questions" field must be valid JSON.');
  }
  if (!Array.isArray(extractedQuestions)) {
    throw new ApiError(400, 'The "questions" field must be a JSON array.');
  }

  const { questions, warnings } = await questionService.commitExtractedQuestions(extractedQuestions, req.file.buffer, {
    examType: examType || '',
    chapter: chapter || '',
    topic: topic || '',
    difficulty: difficulty || 'medium',
    author: author || '',
    subject: subject || '',
    tags: parseTagsField(tags),
  });
  return ApiResponse(res, 200, { questions, warnings }, { created: questions.length, skipped: warnings.length });
});

export const generateQuestionSet = asyncHandler(async (req, res) => {
  const { examType, chapter, topic, difficulty, isPYQ, year, count } = req.body;
  const questions = await questionService.generateQuestionSet({ examType, chapter, topic, difficulty, isPYQ, year, count });
  return ApiResponse(res, 200, questions, { count: questions.length });
});

export const uploadQuestionImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No image uploaded');
  return ApiResponse(res, 200, { imageUrl: `/uploads/question-images/${req.file.filename}` });
});
