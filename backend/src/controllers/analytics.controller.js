import * as analyticsService from '../services/analytics.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { assertStudentAssigned } from '../utils/mentorAccess.js';

export const mentorAnalytics = asyncHandler(async (req, res) => {
  const analytics = await analyticsService.getMentorAnalytics();
  return ApiResponse(res, 200, analytics);
});

export const studentAnalytics = asyncHandler(async (req, res) => {
  const analytics = await analyticsService.getStudentAnalytics(req.user.id, req.user.email);
  return ApiResponse(res, 200, analytics);
});

export const studentDetailAnalytics = asyncHandler(async (req, res) => {
  assertStudentAssigned(req.user, req.params.studentId);
  const analytics = await analyticsService.getStudentDetailAnalytics(req.params.studentId);
  return ApiResponse(res, 200, analytics);
});
