import * as practiceService from '../services/practice.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const getCategories = asyncHandler(async (req, res) => {
  return ApiResponse(res, 200, practiceService.listPracticeCategories());
});

export const getMyProfile = asyncHandler(async (req, res) => {
  const profile = await practiceService.getMyPracticeProfile(req.user.id);
  return ApiResponse(res, 200, profile);
});

export const getAdminStats = asyncHandler(async (req, res) => {
  const stats = await practiceService.getPracticeStatsForAdmin();
  return ApiResponse(res, 200, stats);
});

export const resetProfile = asyncHandler(async (req, res) => {
  const result = await practiceService.resetPracticeProfile(req.params.studentId);
  return ApiResponse(res, 200, result);
});
