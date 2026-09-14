import { ApiError } from '../utils/ApiError.js';

/**
 * Factory that returns middleware validating req.body against a list of
 * required field names. Reused across any route that accepts a form
 * submission, instead of re-writing field checks in each controller.
 *
 * Usage: router.post('/leads', validateBody(['name', 'email']), createLead)
 */
export function validateBody(requiredFields = []) {
  return (req, res, next) => {
    // A plain truthy check would reject legitimate falsy values (price: 0,
    // isFeatured: false) as "missing" — only actual absence counts.
    const missing = requiredFields.filter((field) => {
      const value = req.body?.[field];
      return value === undefined || value === null || value === '';
    });
    if (missing.length > 0) {
      return next(new ApiError(400, `Missing required field(s): ${missing.join(', ')}`));
    }
    next();
  };
}
