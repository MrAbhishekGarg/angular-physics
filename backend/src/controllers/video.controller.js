import fs from 'fs';
import * as videoService from '../services/video.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { streamFile } from '../utils/streamFile.js';

export const listVideosForCourse = asyncHandler(async (req, res) => {
  const videos = await videoService.getVideosForCourse(req.query.courseId);
  return ApiResponse(res, 200, videos, { count: videos.length });
});

export const getVideo = asyncHandler(async (req, res) => {
  const video = await videoService.getVideoById(req.params.id);
  return ApiResponse(res, 200, video);
});

export const createVideo = asyncHandler(async (req, res) => {
  const video = await videoService.createVideo(req.body);
  return ApiResponse(res, 201, video);
});

export const updateVideo = asyncHandler(async (req, res) => {
  const video = await videoService.updateVideo(req.params.id, req.body);
  return ApiResponse(res, 200, video);
});

export const deleteVideo = asyncHandler(async (req, res) => {
  await videoService.deleteVideo(req.params.id);
  return ApiResponse(res, 200, { deleted: true });
});

export const uploadVideoFile = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No video file uploaded');
  const video = await videoService.setVideoFile(req.params.id, {
    fileKey: req.file.filename,
    fileName: req.file.originalname,
    fileType: req.file.mimetype,
    fileSizeBytes: req.file.size,
  });
  return ApiResponse(res, 200, video);
});

export const streamVideo = asyncHandler(async (req, res) => {
  const { absolutePath, mimeType } = await videoService.resolveVideoFileForStreaming(req.params.id, req.user);
  if (!fs.existsSync(absolutePath)) throw new ApiError(404, 'File not found on server');
  streamFile(req, res, absolutePath, mimeType);
});
