import * as studentBatchService from '../services/studentBatch.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const listBatches = asyncHandler(async (req, res) => {
  const batches = await studentBatchService.listBatches();
  return ApiResponse(res, 200, batches, { count: batches.length });
});

export const getBatch = asyncHandler(async (req, res) => {
  const batch = await studentBatchService.getBatchById(req.params.id);
  return ApiResponse(res, 200, batch);
});

export const createBatch = asyncHandler(async (req, res) => {
  const batch = await studentBatchService.createBatch(req.body);
  return ApiResponse(res, 201, batch);
});

export const updateBatch = asyncHandler(async (req, res) => {
  const batch = await studentBatchService.updateBatch(req.params.id, req.body);
  return ApiResponse(res, 200, batch);
});

export const deleteBatch = asyncHandler(async (req, res) => {
  await studentBatchService.deleteBatch(req.params.id);
  return ApiResponse(res, 200, { deleted: true });
});

export const setBatchStudents = asyncHandler(async (req, res) => {
  const batch = await studentBatchService.setBatchStudents(req.params.id, req.body.studentIds || []);
  return ApiResponse(res, 200, batch);
});
