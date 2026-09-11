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
