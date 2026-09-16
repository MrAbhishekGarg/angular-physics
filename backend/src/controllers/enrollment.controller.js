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

async function assertAssignedToEnrollment(req) {
  if (req.user.studentAccessMode === 'selected') {
    const existing = await enrollmentService.getEnrollmentById(req.params.id);
    assertStudentAssigned(req.user, existing.studentId);
  }
}

// ---- Live-course fee tracking ----

export const listMyFees = asyncHandler(async (req, res) => {
  const enrollments = await enrollmentService.getStudentEnrollments(req.user.id);
  const withFees = enrollments.filter((e) => e.courseId?.courseType === 'live' || e.feeType);
  return ApiResponse(res, 200, withFees);
});

export const setFeeConfig = asyncHandler(async (req, res) => {
  await assertAssignedToEnrollment(req);
  const { feeType, totalFee, monthlyFee, securityAmount, feeNotes, registrationDate } = req.body;
  if (feeType !== undefined && !['one-time', 'monthly'].includes(feeType)) {
    throw new ApiError(400, "feeType must be 'one-time' or 'monthly'");
  }
  const enrollment = await enrollmentService.setEnrollmentFeeConfig(req.params.id, {
    feeType,
    totalFee,
    monthlyFee,
    securityAmount,
    feeNotes,
    registrationDate,
  });
  return ApiResponse(res, 200, enrollment);
});

export const generateMissingMonths = asyncHandler(async (req, res) => {
  await assertAssignedToEnrollment(req);
  const { enrollment, addedCount } = await enrollmentService.generateMissingMonths(req.params.id);
  return ApiResponse(res, 200, enrollment, { addedCount });
});

export const setSecurityPaid = asyncHandler(async (req, res) => {
  await assertAssignedToEnrollment(req);
  const { securityPaid } = req.body;
  if (typeof securityPaid !== 'number' || securityPaid < 0) throw new ApiError(400, 'securityPaid must be a non-negative number');
  const enrollment = await enrollmentService.setSecurityPaid(req.params.id, securityPaid);
  return ApiResponse(res, 200, enrollment);
});

export const addPayment = asyncHandler(async (req, res) => {
  await assertAssignedToEnrollment(req);
  const { amount, date, note } = req.body;
  if (typeof amount !== 'number' || amount <= 0) throw new ApiError(400, 'amount must be a positive number');
  const enrollment = await enrollmentService.addPayment(req.params.id, { amount, date, note });
  return ApiResponse(res, 201, enrollment);
});

export const removePayment = asyncHandler(async (req, res) => {
  await assertAssignedToEnrollment(req);
  const enrollment = await enrollmentService.removePayment(req.params.id, req.params.paymentId);
  return ApiResponse(res, 200, enrollment);
});

export const addMonthlyEntry = asyncHandler(async (req, res) => {
  await assertAssignedToEnrollment(req);
  const { month, amount, dueDate } = req.body;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) throw new ApiError(400, "month must be in 'YYYY-MM' format");
  const enrollment = await enrollmentService.addMonthlyEntry(req.params.id, { month, amount, dueDate });
  return ApiResponse(res, 201, enrollment);
});

export const updateMonthlyEntry = asyncHandler(async (req, res) => {
  await assertAssignedToEnrollment(req);
  const { amount, dueDate, paid, paidDate, note } = req.body;
  const enrollment = await enrollmentService.updateMonthlyEntry(req.params.id, req.params.monthId, { amount, dueDate, paid, paidDate, note });
  return ApiResponse(res, 200, enrollment);
});

export const removeMonthlyEntry = asyncHandler(async (req, res) => {
  await assertAssignedToEnrollment(req);
  const enrollment = await enrollmentService.removeMonthlyEntry(req.params.id, req.params.monthId);
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
