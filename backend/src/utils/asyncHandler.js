/**
 * Wraps an async Express route handler so thrown errors are forwarded to
 * the centralized error middleware instead of every controller needing
 * its own try/catch (DRY).
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
