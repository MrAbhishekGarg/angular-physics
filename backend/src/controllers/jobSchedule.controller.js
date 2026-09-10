import fs from 'fs';
import path from 'path';
import * as jobScheduleService from '../services/jobSchedule.service.js';
import JobScheduleUpload from '../models/JobScheduleUpload.js';
import { JOB_SCHEDULE_UPLOADS_DIR } from '../middleware/upload.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

const CONTENT_TYPE_BY_EXT = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function isImagePath(storedPath) {
  return path.extname(storedPath).toLowerCase() !== '.pdf';
}

export const ingestSchedule = asyncHandler(async (req, res) => {
  const { upload, classes, warnings } = await jobScheduleService.ingestScheduleFile(req.file, { date: req.body.date });
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

export const listUploads = asyncHandler(async (req, res) => {
  const uploads = await JobScheduleUpload.find().sort({ date: -1 }).lean();
  return ApiResponse(
    res,
    200,
    uploads.map((u) => ({ ...u, isImage: isImagePath(u.storedPath) })),
    { count: uploads.length }
  );
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

export const getDashboard = asyncHandler(async (req, res) => {
  const data = await jobScheduleService.getDashboard();
  return ApiResponse(res, 200, data);
});

export const listTopicPlans = asyncHandler(async (req, res) => {
  const topics = await jobScheduleService.listTopicPlans(req.query.batchCode);
  return ApiResponse(res, 200, topics, { count: topics.length });
});

export const createTopicPlan = asyncHandler(async (req, res) => {
  const created = await jobScheduleService.createTopicPlan(req.body);
  return ApiResponse(res, 201, created);
});

export const updateTopicPlan = asyncHandler(async (req, res) => {
  const updated = await jobScheduleService.updateTopicPlan(req.params.id, req.body);
  return ApiResponse(res, 200, updated);
});

export const deleteTopicPlan = asyncHandler(async (req, res) => {
  await jobScheduleService.deleteTopicPlan(req.params.id);
  return ApiResponse(res, 200, { deleted: true });
});

export const downloadScheduleFile = asyncHandler(async (req, res) => {
  const upload = await JobScheduleUpload.findById(req.params.id).lean();
  if (!upload) throw new ApiError(404, 'Schedule upload not found');

  const absolutePath = path.join(JOB_SCHEDULE_UPLOADS_DIR, upload.storedPath);
  if (!fs.existsSync(absolutePath)) throw new ApiError(404, 'File not found on server');

  const ext = path.extname(upload.storedPath).toLowerCase();
  res.setHeader('Content-Type', CONTENT_TYPE_BY_EXT[ext] || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${upload.originalFilename || upload.storedPath}"`);
  fs.createReadStream(absolutePath).pipe(res);
});
