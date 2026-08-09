import * as leadService from '../services/lead.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const createLead = asyncHandler(async (req, res) => {
  const { name, email, phone, courseSlug, message } = req.body;
  const lead = await leadService.createLead({ name, email, phone, courseSlug, message });
  return ApiResponse(res, 201, lead);
});

export const listLeads = asyncHandler(async (req, res) => {
  const leads = await leadService.getAllLeads();
  return ApiResponse(res, 200, leads, { count: leads.length });
});
