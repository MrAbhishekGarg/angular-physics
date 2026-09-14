import * as notificationService from '../services/notification.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const listMine = asyncHandler(async (req, res) => {
  const result = await notificationService.listMine(req.user.id);
  return ApiResponse(res, 200, result);
});

export const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markRead(req.user.id, req.params.id);
  return ApiResponse(res, 200, notification);
});

export const markAllRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllRead(req.user.id);
  return ApiResponse(res, 200, result);
});
