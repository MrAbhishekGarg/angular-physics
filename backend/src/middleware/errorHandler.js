import { env } from '../config/env.js';

/**
 * Single place that formats every error response — controllers just
 * `throw new ApiError(...)` or let async errors bubble via asyncHandler.
 */
export function errorHandler(err, req, res, next) {
  // Mongoose schema validation (required/match/enum/etc.) failing at
  // .create()/.save() — not a server fault, so surface the field messages
  // directly instead of falling through to the generic 500 below.
  if (err.name === 'ValidationError' && err.errors) {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join('; ');
    return res.status(400).json({ success: false, error: message });
  }

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
