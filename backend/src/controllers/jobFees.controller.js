import * as jobFeesService from '../services/jobFees.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const listBatches = asyncHandler(async (req, res) => {
  const data = await jobFeesService.listBatches();
  return ApiResponse(res, 200, data);
});

export const createBatch = asyncHandler(async (req, res) => {
  const created = await jobFeesService.createBatch(req.body);
  return ApiResponse(res, 201, created);
});

export const updateBatch = asyncHandler(async (req, res) => {
  const updated = await jobFeesService.updateBatch(req.params.id, req.body);
  return ApiResponse(res, 200, updated);
});

export const deleteBatch = asyncHandler(async (req, res) => {
  await jobFeesService.deleteBatch(req.params.id);
  return ApiResponse(res, 200, { deleted: true });
});

export const createStudent = asyncHandler(async (req, res) => {
  const created = await jobFeesService.createStudent(req.params.batchId, req.body);
  return ApiResponse(res, 201, created);
});

export const updateStudent = asyncHandler(async (req, res) => {
  const updated = await jobFeesService.updateStudent(req.params.id, req.body);
  return ApiResponse(res, 200, updated);
});

export const deleteStudent = asyncHandler(async (req, res) => {
  await jobFeesService.deleteStudent(req.params.id);
  return ApiResponse(res, 200, { deleted: true });
});

export const addPayment = asyncHandler(async (req, res) => {
  const updated = await jobFeesService.addPayment(req.params.id, req.body);
  return ApiResponse(res, 201, updated);
});

export const removePayment = asyncHandler(async (req, res) => {
  const updated = await jobFeesService.removePayment(req.params.id, req.params.paymentId);
  return ApiResponse(res, 200, updated);
});
