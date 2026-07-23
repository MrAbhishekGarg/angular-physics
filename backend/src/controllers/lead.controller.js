import * as leadService from '../services/lead.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const createLead = asyncHandler(async (req, res) => {
  const { name, email, phone, courseSlug, message } = req.body;
  const lead = await leadService.createLead({ name, email, phone, courseSlug, message });
  return ApiResponse(res, 201, lead);
});
