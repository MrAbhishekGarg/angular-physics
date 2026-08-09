import * as authService from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { COOKIE_NAME, cookieOptions, signToken } from '../utils/token.js';

export const signup = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  const user = await authService.registerStudent({ name, email, password, phone });
  const token = signToken({ _id: user.id, role: user.role });
  res.cookie(COOKIE_NAME, token, cookieOptions());
  return ApiResponse(res, 201, user);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { safeUser } = await authService.authenticateUser({ email, password });
  const token = signToken({ _id: safeUser.id, role: safeUser.role });
  res.cookie(COOKIE_NAME, token, cookieOptions());
  return ApiResponse(res, 200, safeUser);
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie(COOKIE_NAME);
  return ApiResponse(res, 200, { loggedOut: true });
});

export const me = asyncHandler(async (req, res) => {
  return ApiResponse(res, 200, req.user);
});

export const createMentor = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  const mentor = await authService.createMentor({ name, email, password, phone });
  return ApiResponse(res, 201, mentor);
});

export const listMentors = asyncHandler(async (req, res) => {
  const mentors = await authService.listMentors();
  return ApiResponse(res, 200, mentors, { count: mentors.length });
});

export const resetMentorPassword = asyncHandler(async (req, res) => {
  const user = await authService.resetPassword(req.params.id, req.body.newPassword, 'mentor');
  return ApiResponse(res, 200, user);
});

export const removeMentor = asyncHandler(async (req, res) => {
  await authService.removeMentor(req.params.id);
  return ApiResponse(res, 200, { deleted: true });
});

export const resetStudentPassword = asyncHandler(async (req, res) => {
  const user = await authService.resetPassword(req.params.id, req.body.newPassword, 'student');
  return ApiResponse(res, 200, user);
});

export const listStudents = asyncHandler(async (req, res) => {
  const students = await authService.listStudents();
  return ApiResponse(res, 200, students, { count: students.length });
});
