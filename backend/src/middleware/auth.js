import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { COOKIE_NAME, verifyToken } from '../utils/token.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw new ApiError(401, 'Not authenticated');

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    throw new ApiError(401, 'Session expired — please log in again');
  }

  const user = await User.findById(decoded.sub).lean();
  if (!user) throw new ApiError(401, 'Not authenticated');

  req.user = { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
  next();
});

export function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(new ApiError(403, 'Not authorized'));
    }
    next();
  };
}
