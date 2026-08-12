import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { COOKIE_NAME, verifyToken } from '../utils/token.js';
import { ADMIN_ID, adminSafeUser, isAdminConfigured } from '../utils/adminUser.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw new ApiError(401, 'Not authenticated');

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    throw new ApiError(401, 'Session expired — please log in again');
  }

  // The env admin has no database row — resolve it from config instead.
  if (decoded.sub === ADMIN_ID) {
    if (!isAdminConfigured()) throw new ApiError(401, 'Not authenticated');
    req.user = adminSafeUser();
    return next();
  }

  const user = await User.findById(decoded.sub).lean();
  if (!user) throw new ApiError(401, 'Not authenticated');

  req.user = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    restrictedSections: user.restrictedSections || [],
  };
  next();
});

export function authorize(...roles) {
  return (req, res, next) => {
    // Admin can do anything — a real, enforced bypass here rather than
    // something every route has to remember to add 'admin' to.
    if (req.user?.role === 'admin') return next();
    if (!roles.includes(req.user?.role)) {
      return next(new ApiError(403, 'Not authorized'));
    }
    next();
  };
}

/**
 * Per-mentor section gate, composed after authorize('mentor') on a route
 * (e.g. `authorize('mentor'), requireSection('questions')`). A no-op for
 * anyone who isn't a plain mentor — admin already bypassed authorize()
 * above and never carries restrictedSections, and a student would already
 * have been rejected by authorize('mentor') before this ever runs.
 */
export function requireSection(sectionKey) {
  return (req, res, next) => {
    if (req.user?.role !== 'mentor') return next();
    if (req.user.restrictedSections?.includes(sectionKey)) {
      return next(new ApiError(403, 'Not authorized for this section'));
    }
    next();
  };
}
