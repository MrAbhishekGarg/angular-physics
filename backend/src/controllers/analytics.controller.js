import * as analyticsService from '../services/analytics.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const mentorAnalytics = asyncHandler(async (req, res) => {
  const analytics = await analyticsService.getMentorAnalytics();
  return ApiResponse(res, 200, analytics);
});

export const studentAnalytics = asyncHandler(async (req, res) => {
  const analytics = await analyticsService.getStudentAnalytics(req.user.id, req.user.email);
  return ApiResponse(res, 200, analytics);
});
