import * as courseFeesService from '../services/courseFees.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const listBatches = asyncHandler(async (req, res) => {
  const data = await courseFeesService.listBatches();
  return ApiResponse(res, 200, data);
});

export const createBatch = asyncHandler(async (req, res) => {
  const created = await courseFeesService.createBatch(req.body);
  return ApiResponse(res, 201, created);
});

export const updateBatch = asyncHandler(async (req, res) => {
  const updated = await courseFeesService.updateBatch(req.params.id, req.body);
  return ApiResponse(res, 200, updated);
});

export const deleteBatch = asyncHandler(async (req, res) => {
  await courseFeesService.deleteBatch(req.params.id);
  return ApiResponse(res, 200, { deleted: true });
});

export const createStudent = asyncHandler(async (req, res) => {
  const created = await courseFeesService.createStudent(req.params.batchId, req.body);
  return ApiResponse(res, 201, created);
});

export const updateStudent = asyncHandler(async (req, res) => {
  const updated = await courseFeesService.updateStudent(req.params.id, req.body);
  return ApiResponse(res, 200, updated);
});

export const deleteStudent = asyncHandler(async (req, res) => {
  await courseFeesService.deleteStudent(req.params.id);
  return ApiResponse(res, 200, { deleted: true });
});

export const addPayment = asyncHandler(async (req, res) => {
  const updated = await courseFeesService.addPayment(req.params.id, req.body);
  return ApiResponse(res, 201, updated);
});

export const removePayment = asyncHandler(async (req, res) => {
  const updated = await courseFeesService.removePayment(req.params.id, req.params.paymentId);
  return ApiResponse(res, 200, updated);
});

export const addMonthPayment = asyncHandler(async (req, res) => {
  const updated = await courseFeesService.addMonthPayment(req.params.id, req.body);
  return ApiResponse(res, 201, updated);
});

export const updateMonthPayment = asyncHandler(async (req, res) => {
  const updated = await courseFeesService.updateMonthPayment(req.params.id, req.params.monthId, req.body);
  return ApiResponse(res, 200, updated);
});

export const removeMonthPayment = asyncHandler(async (req, res) => {
  const updated = await courseFeesService.removeMonthPayment(req.params.id, req.params.monthId);
  return ApiResponse(res, 200, updated);
});

export const registerStudentAccount = asyncHandler(async (req, res) => {
  const result = await courseFeesService.registerStudentAccount(req.params.id, req.body);
  return ApiResponse(res, 201, result);
});

export const sendFeeReminder = asyncHandler(async (req, res) => {
  const result = await courseFeesService.sendFeeReminder(req.params.id, req.body);
  return ApiResponse(res, 200, result);
});

// ---- class logs ----

export const addClassLog = asyncHandler(async (req, res) => {
  const created = await courseFeesService.addClassLog(req.params.batchId, req.body);
  return ApiResponse(res, 201, created);
});

export const updateClassLog = asyncHandler(async (req, res) => {
  const updated = await courseFeesService.updateClassLog(req.params.id, req.body);
  return ApiResponse(res, 200, updated);
});

export const removeClassLog = asyncHandler(async (req, res) => {
  await courseFeesService.removeClassLog(req.params.id);
  return ApiResponse(res, 200, { deleted: true });
});

// ---- upcoming plan lists ----

export const addUpcomingTopic = asyncHandler(async (req, res) => {
  const updated = await courseFeesService.addUpcomingTopic(req.params.batchId, req.body);
  return ApiResponse(res, 201, updated);
});
export const removeUpcomingTopic = asyncHandler(async (req, res) => {
  const updated = await courseFeesService.removeUpcomingTopic(req.params.batchId, req.params.itemId);
  return ApiResponse(res, 200, updated);
});

export const addUpcomingTest = asyncHandler(async (req, res) => {
  const updated = await courseFeesService.addUpcomingTest(req.params.batchId, req.body);
  return ApiResponse(res, 201, updated);
});
export const removeUpcomingTest = asyncHandler(async (req, res) => {
  const updated = await courseFeesService.removeUpcomingTest(req.params.batchId, req.params.itemId);
  return ApiResponse(res, 200, updated);
});

export const addUpcomingWorksheet = asyncHandler(async (req, res) => {
  const updated = await courseFeesService.addUpcomingWorksheet(req.params.batchId, req.body);
  return ApiResponse(res, 201, updated);
});
export const removeUpcomingWorksheet = asyncHandler(async (req, res) => {
  const updated = await courseFeesService.removeUpcomingWorksheet(req.params.batchId, req.params.itemId);
  return ApiResponse(res, 200, updated);
});

// ---- student self-service (authenticate + authorize('student'), no course-fees section gate) ----

export const getMyCourseFee = asyncHandler(async (req, res) => {
  const data = await courseFeesService.getMyCourseFee(req.user.id);
  return ApiResponse(res, 200, data);
});

export const getMySchedule = asyncHandler(async (req, res) => {
  const data = await courseFeesService.getMySchedule(req.user.id);
  return ApiResponse(res, 200, data);
});

export const claimMonthPayment = asyncHandler(async (req, res) => {
  const updated = await courseFeesService.claimMonthPayment(req.user.id, req.params.monthId);
  return ApiResponse(res, 200, updated);
});
