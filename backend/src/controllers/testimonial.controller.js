import * as testimonialService from '../services/testimonial.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const listTestimonialsForMentor = asyncHandler(async (req, res) => {
  const testimonials = await testimonialService.getAllTestimonialsForMentor();
  return ApiResponse(res, 200, testimonials, { count: testimonials.length });
});

export const createTestimonial = asyncHandler(async (req, res) => {
  const testimonial = await testimonialService.createTestimonial(req.user.id, req.body);
  return ApiResponse(res, 201, testimonial);
});

export const updateTestimonial = asyncHandler(async (req, res) => {
  const testimonial = await testimonialService.updateTestimonial(req.params.id, req.body);
  return ApiResponse(res, 200, testimonial);
});

export const deleteTestimonial = asyncHandler(async (req, res) => {
  await testimonialService.deleteTestimonial(req.params.id);
  return ApiResponse(res, 200, { deleted: true });
});
