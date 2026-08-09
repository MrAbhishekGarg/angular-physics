import * as topperService from '../services/topper.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const listToppers = asyncHandler(async (req, res) => {
  const toppers = await topperService.getAllToppers();
  return ApiResponse(res, 200, toppers, { count: toppers.length });
});

export const createTopper = asyncHandler(async (req, res) => {
  const topper = await topperService.createTopper(req.body);
  return ApiResponse(res, 201, topper);
});

export const updateTopper = asyncHandler(async (req, res) => {
  const topper = await topperService.updateTopper(req.params.id, req.body);
  return ApiResponse(res, 200, topper);
});

export const deleteTopper = asyncHandler(async (req, res) => {
  await topperService.deleteTopper(req.params.id);
  return ApiResponse(res, 200, { deleted: true });
});

export const uploadTopperPhoto = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No image file uploaded');
  const photoUrl = `/uploads/content/${req.file.filename}`;
  const topper = await topperService.setTopperPhoto(req.params.id, photoUrl);
  return ApiResponse(res, 200, topper);
});
