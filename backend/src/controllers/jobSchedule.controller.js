import fs from 'fs';
import path from 'path';
import * as jobScheduleService from '../services/jobSchedule.service.js';
import JobScheduleUpload from '../models/JobScheduleUpload.js';
import { JOB_SCHEDULE_UPLOADS_DIR } from '../middleware/upload.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const ingestSchedule = asyncHandler(async (req, res) => {
  const { upload, classes, warnings } = await jobScheduleService.ingestSchedulePdf(req.file.buffer, req.file.originalname);
  return ApiResponse(res, 201, { upload, classes, warnings }, { extracted: classes.length });
});

export const listClasses = asyncHandler(async (req, res) => {
  const { from, to, batchCode, needsReview } = req.query;
  const classes = await jobScheduleService.listClasses({
    from,
    to,
    batchCode,
    needsReview: needsReview === undefined ? undefined : needsReview === 'true',
  });
  return ApiResponse(res, 200, classes, { count: classes.length });
});

export const createClass = asyncHandler(async (req, res) => {
  const created = await jobScheduleService.createClass(req.body);
  return ApiResponse(res, 201, created);
});

export const updateClass = asyncHandler(async (req, res) => {
  const updated = await jobScheduleService.updateClass(req.params.id, req.body);
  return ApiResponse(res, 200, updated);
});

export const deleteClass = asyncHandler(async (req, res) => {
  await jobScheduleService.deleteClass(req.params.id);
  return ApiResponse(res, 200, { deleted: true });
});

export const deleteUpload = asyncHandler(async (req, res) => {
  await jobScheduleService.deleteUpload(req.params.id);
  return ApiResponse(res, 200, { deleted: true });
});

export const getBatches = asyncHandler(async (req, res) => {
  const batches = await jobScheduleService.getBatchSummaries();
  return ApiResponse(res, 200, batches, { count: batches.length });
});

export const downloadSchedulePdf = asyncHandler(async (req, res) => {
  const upload = await JobScheduleUpload.findById(req.params.id).lean();
  if (!upload) throw new ApiError(404, 'Schedule upload not found');

  const absolutePath = path.join(JOB_SCHEDULE_UPLOADS_DIR, upload.storedPath);
  if (!fs.existsSync(absolutePath)) throw new ApiError(404, 'File not found on server');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${upload.originalFilename || upload.storedPath}"`);
  fs.createReadStream(absolutePath).pipe(res);
});
