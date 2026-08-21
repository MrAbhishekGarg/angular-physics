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
  const { examType, chapter, topic, difficulty, search, isPYQ, author, tag, subject, conceptCode } = req.query;
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

export const bulkUploadQuestions = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No .docx file uploaded');
  const { examType, chapter, topic, difficulty, isPYQ, pyqYear, author, subject, tags } = req.body;

  const { questions, warnings } = await questionService.bulkCreateFromDocx(req.file.buffer, {
    examType: examType || '',
    chapter: chapter || '',
    topic: topic || '',
    difficulty: difficulty || 'medium',
    isPYQ: isPYQ === 'true',
    pyqYear: pyqYear ? Number(pyqYear) : undefined,
    author: author || '',
    subject: subject || '',
    tags: parseTagsField(tags),
  });
  return ApiResponse(res, 200, { questions, warnings }, { created: questions.length, skipped: warnings.length });
});

export const bulkUploadQuestionsMapped = asyncHandler(async (req, res) => {
  const { examType, chapter, topic, difficulty, author, subject, tags } = req.body;

  const { questions, warnings } = await questionService.bulkCreateFromDocxAndExcel(
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

export const generateQuestionSet = asyncHandler(async (req, res) => {
  const { examType, chapter, topic, difficulty, isPYQ, year, count } = req.body;
  const questions = await questionService.generateQuestionSet({ examType, chapter, topic, difficulty, isPYQ, year, count });
  return ApiResponse(res, 200, questions, { count: questions.length });
});

export const uploadQuestionImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No image uploaded');
  return ApiResponse(res, 200, { imageUrl: `/uploads/question-images/${req.file.filename}` });
});
