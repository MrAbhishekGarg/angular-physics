import * as questionOfDayService from '../services/questionOfDay.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const getQuestionOfDay = asyncHandler(async (req, res) => {
  const question = await questionOfDayService.getSanitizedQuestionOfDay();
  return ApiResponse(res, 200, question);
});

export const checkQuestionOfDay = asyncHandler(async (req, res) => {
  const result = await questionOfDayService.checkQuestionOfDay(req.body);
  return ApiResponse(res, 200, result);
});

export const setQuestionOfDay = asyncHandler(async (req, res) => {
  if (!req.body.questionId) throw new ApiError(400, 'questionId is required');
  const entry = await questionOfDayService.setQuestionOfDay(req.body.questionId);
  return ApiResponse(res, 201, entry);
});
