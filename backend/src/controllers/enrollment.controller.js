import * as enrollmentService from '../services/enrollment.service.js';
import { getStudentTestStats } from '../services/test.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

const VALID_STATUSES = ['pending', 'active', 'completed', 'cancelled'];

export const enroll = asyncHandler(async (req, res) => {
  const { courseId } = req.body;
  const enrollment = await enrollmentService.createEnrollment(req.user.id, courseId);
  return ApiResponse(res, 201, enrollment);
});

export const listMyEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await enrollmentService.getStudentEnrollments(req.user.id);
  return ApiResponse(res, 200, enrollments);
});

export const listAllEnrollments = asyncHandler(async (req, res) => {
  const { courseId } = req.query;
  const enrollments = await enrollmentService.getAllEnrollments({ courseId });
  return ApiResponse(res, 200, enrollments);
});

export const listStudentStats = asyncHandler(async (req, res) => {
  const stats = await getStudentTestStats();
  return ApiResponse(res, 200, stats);
});

export const update = asyncHandler(async (req, res) => {
  const { status, progressPercent } = req.body;
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    throw new ApiError(400, `status must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  if (progressPercent !== undefined && (progressPercent < 0 || progressPercent > 100)) {
    throw new ApiError(400, 'progressPercent must be between 0 and 100');
  }
  const enrollment = await enrollmentService.updateEnrollment(req.params.id, { status, progressPercent });
  return ApiResponse(res, 200, enrollment);
});
