import * as doubtService from '../services/doubt.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const createDoubt = asyncHandler(async (req, res) => {
  const doubt = await doubtService.createDoubt(req.user.id, req.body);
  return ApiResponse(res, 201, doubt);
});

export const listMyDoubts = asyncHandler(async (req, res) => {
  const doubts = await doubtService.getMyDoubts(req.user.id);
  return ApiResponse(res, 200, doubts, { count: doubts.length });
});

export const listAllDoubts = asyncHandler(async (req, res) => {
  const courseIds = req.user.courseAccessMode === 'selected' ? req.user.assignedCourseIds : undefined;
  const doubts = await doubtService.getAllDoubts({ status: req.query.status, courseIds });
  return ApiResponse(res, 200, doubts, { count: doubts.length });
});

export const answerDoubt = asyncHandler(async (req, res) => {
  const doubt = await doubtService.answerDoubt(req.params.id, req.body, req.user);
  return ApiResponse(res, 200, doubt);
});

export const closeDoubt = asyncHandler(async (req, res) => {
  const doubt = await doubtService.closeDoubt(req.params.id, req.user);
  return ApiResponse(res, 200, doubt);
});

export const markDoubtCleared = asyncHandler(async (req, res) => {
  const doubt = await doubtService.markDoubtCleared(req.params.id, req.user.id);
  return ApiResponse(res, 200, doubt);
});

export const deleteDoubt = asyncHandler(async (req, res) => {
  await doubtService.deleteDoubt(req.params.id, req.user.id);
  return ApiResponse(res, 200, { deleted: true });
});

export const uploadDoubtImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No image uploaded');
  return ApiResponse(res, 200, { imageUrl: `/uploads/doubt-images/${req.file.filename}` });
});
