import { env } from '../config/env.js';

/**
 * Single place that formats every error response — controllers just
 * `throw new ApiError(...)` or let async errors bubble via asyncHandler.
 */
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Something went wrong. Please try again.';

  if (!err.isOperational) {
    console.error('[unhandled error]', err);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(env.nodeEnv === 'development' && !err.isOperational ? { stack: err.stack } : {}),
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, error: `Route not found: ${req.originalUrl}` });
}
