import * as conceptCodeService from '../services/conceptCode.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const listConceptCodes = asyncHandler(async (req, res) => {
  const codes = await conceptCodeService.getAllConceptCodes();
  return ApiResponse(res, 200, codes, { count: codes.length });
});

export const createConceptCode = asyncHandler(async (req, res) => {
  const code = await conceptCodeService.createConceptCode(req.body);
  return ApiResponse(res, 201, code);
});

export const updateConceptCode = asyncHandler(async (req, res) => {
  const code = await conceptCodeService.updateConceptCode(req.params.id, req.body);
  return ApiResponse(res, 200, code);
});

export const deleteConceptCode = asyncHandler(async (req, res) => {
  await conceptCodeService.deleteConceptCode(req.params.id);
  return ApiResponse(res, 200, { deleted: true });
});

export const bulkUploadConceptCodes = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No Excel file uploaded');
  const { created, updated, warnings } = await conceptCodeService.bulkUpsertFromExcel(req.file.buffer);
  return ApiResponse(res, 200, { created, updated, warnings }, { created, updated, skipped: warnings.length });
});
