import * as featuredVideoService from '../services/featuredVideo.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const listFeaturedVideos = asyncHandler(async (req, res) => {
  const videos = await featuredVideoService.getAllFeaturedVideos();
  return ApiResponse(res, 200, videos, { count: videos.length });
});

export const createFeaturedVideo = asyncHandler(async (req, res) => {
  const video = await featuredVideoService.createFeaturedVideo(req.body);
  return ApiResponse(res, 201, video);
});

export const updateFeaturedVideo = asyncHandler(async (req, res) => {
  const video = await featuredVideoService.updateFeaturedVideo(req.params.id, req.body);
  return ApiResponse(res, 200, video);
});

export const deleteFeaturedVideo = asyncHandler(async (req, res) => {
  await featuredVideoService.deleteFeaturedVideo(req.params.id);
  return ApiResponse(res, 200, { deleted: true });
});
