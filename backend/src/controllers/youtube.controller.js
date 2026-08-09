import * as youtubeService from '../services/youtube.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const getLatestUploads = asyncHandler(async (req, res) => {
  const videos = await youtubeService.getLatestUploads();
  return ApiResponse(res, 200, videos, { count: videos.length });
});
