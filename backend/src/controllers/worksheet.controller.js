import fs from 'fs';
import * as worksheetService from '../services/worksheet.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const listWorksheets = asyncHandler(async (req, res) => {
  const { type, examType } = req.query;
  const worksheets = await worksheetService.getAllWorksheets({ type, examType });
  return ApiResponse(res, 200, worksheets, { count: worksheets.length });
});

export const getWorksheet = asyncHandler(async (req, res) => {
  const worksheet = await worksheetService.getWorksheetById(req.params.id);
  return ApiResponse(res, 200, worksheet);
});

export const createWorksheet = asyncHandler(async (req, res) => {
  const worksheet = await worksheetService.createWorksheet(req.body);
  return ApiResponse(res, 201, worksheet);
});

export const updateWorksheet = asyncHandler(async (req, res) => {
  const worksheet = await worksheetService.updateWorksheet(req.params.id, req.body);
  return ApiResponse(res, 200, worksheet);
});

export const deleteWorksheet = asyncHandler(async (req, res) => {
  await worksheetService.deleteWorksheet(req.params.id);
  return ApiResponse(res, 200, { deleted: true });
});

export const uploadWorksheetFile = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No file uploaded');
  const worksheet = await worksheetService.setWorksheetFile(req.params.id, {
    fileKey: req.file.filename,
    fileName: req.file.originalname,
    fileSizeBytes: req.file.size,
  });
  return ApiResponse(res, 200, worksheet);
});

export const assignWorksheet = asyncHandler(async (req, res) => {
  const worksheet = await worksheetService.assignWorksheetToCourses(req.params.id, req.body.courseIds || []);
  return ApiResponse(res, 200, worksheet);
});

export const listAvailableWorksheets = asyncHandler(async (req, res) => {
  const worksheets = await worksheetService.getAvailableWorksheetsForStudent(req.user.id);
  return ApiResponse(res, 200, worksheets, { count: worksheets.length });
});

export const downloadWorksheet = asyncHandler(async (req, res) => {
  const { absolutePath, fileName } = await worksheetService.resolveWorksheetFileForDownload(req.params.id, req.user);

  if (!fs.existsSync(absolutePath)) throw new ApiError(404, 'File not found on server');

  if (req.user.role !== 'mentor' && req.user.role !== 'admin') {
    await worksheetService.markWorksheetDownloaded(req.params.id, req.user.id);
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
  fs.createReadStream(absolutePath).pipe(res);
});

export const completeWorksheet = asyncHandler(async (req, res) => {
  const progress = await worksheetService.markWorksheetCompleted(req.params.id, req.user.id);
  return ApiResponse(res, 200, progress);
});

export const getWorksheetProgress = asyncHandler(async (req, res) => {
  const progress = await worksheetService.getWorksheetProgressForMentor(req.params.id);
  return ApiResponse(res, 200, progress, { count: progress.length });
});
