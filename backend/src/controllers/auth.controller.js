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
