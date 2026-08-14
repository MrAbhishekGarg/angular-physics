import * as enrollmentService from '../services/enrollment.service.js';
import { getStudentTestStats } from '../services/test.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { assertStudentAssigned } from '../utils/mentorAccess.js';

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
  const studentIds = req.user.studentAccessMode === 'selected' ? req.user.assignedStudentIds : undefined;
  const enrollments = await enrollmentService.getAllEnrollments({ courseId, studentIds });
  return ApiResponse(res, 200, enrollments);
});

export const listStudentStats = asyncHandler(async (req, res) => {
  const studentIds = req.user.studentAccessMode === 'selected' ? req.user.assignedStudentIds : undefined;
  const stats = await getStudentTestStats({ studentIds });
  return ApiResponse(res, 200, stats);
});

export const listAllStudentsOverview = asyncHandler(async (req, res) => {
  const studentIds = req.user.studentAccessMode === 'selected' ? req.user.assignedStudentIds : undefined;
  const students = await enrollmentService.getAllStudentsOverview({ studentIds });
  return ApiResponse(res, 200, students, { count: students.length });
});

export const grantAccess = asyncHandler(async (req, res) => {
  const { studentId, courseId } = req.body;
  const enrollment = await enrollmentService.grantCourseAccess(studentId, courseId);
  return ApiResponse(res, 200, enrollment);
});

export const update = asyncHandler(async (req, res) => {
  const { status, progressPercent } = req.body;
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    throw new ApiError(400, `status must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  if (progressPercent !== undefined && (progressPercent < 0 || progressPercent > 100)) {
    throw new ApiError(400, 'progressPercent must be between 0 and 100');
  }
  if (req.user.studentAccessMode === 'selected') {
    const existing = await enrollmentService.getEnrollmentById(req.params.id);
    assertStudentAssigned(req.user, existing.studentId);
  }
  const enrollment = await enrollmentService.updateEnrollment(req.params.id, { status, progressPercent });
  return ApiResponse(res, 200, enrollment);
});
