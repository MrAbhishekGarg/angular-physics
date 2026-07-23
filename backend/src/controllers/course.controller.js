import * as courseService from '../services/course.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const listCourses = asyncHandler(async (req, res) => {
  const { track } = req.query;
  const courses = await courseService.getAllCourses({ track });
  return ApiResponse(res, 200, courses, { count: courses.length });
});

export const getFeaturedCourses = asyncHandler(async (req, res) => {
  const courses = await courseService.getFeaturedCourses();
  return ApiResponse(res, 200, courses);
});

export const getCourseBySlug = asyncHandler(async (req, res) => {
  const course = await courseService.getCourseBySlug(req.params.slug);
  return ApiResponse(res, 200, course);
});

export const listTestimonials = asyncHandler(async (req, res) => {
  const testimonials = await courseService.getAllTestimonials();
  return ApiResponse(res, 200, testimonials);
});

export const createCourse = asyncHandler(async (req, res) => {
  const course = await courseService.createCourse(req.body);
  return ApiResponse(res, 201, course);
});

export const updateCourse = asyncHandler(async (req, res) => {
  const course = await courseService.updateCourse(req.params.id, req.body);
  return ApiResponse(res, 200, course);
});

export const deleteCourse = asyncHandler(async (req, res) => {
  await courseService.deleteCourse(req.params.id);
  return ApiResponse(res, 200, { deleted: true });
});

export const uploadCourseImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No image file uploaded');
  const imageUrl = `/uploads/courses/${req.file.filename}`;
  const course = await courseService.setCourseImage(req.params.id, imageUrl);
  return ApiResponse(res, 200, course);
});
