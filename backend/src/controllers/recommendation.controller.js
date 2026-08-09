import * as recommendationService from '../services/recommendation.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const getMyRecommendations = asyncHandler(async (req, res) => {
  const recommendations = await recommendationService.getRecommendationsForStudent(req.user.id);
  return ApiResponse(res, 200, recommendations);
});
