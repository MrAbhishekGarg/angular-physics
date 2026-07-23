/**
 * Every successful response goes through this so the frontend can always
 * rely on the same envelope: { success, data, meta }.
 */
export function ApiResponse(res, statusCode, data, meta = {}) {
  return res.status(statusCode).json({ success: true, data, meta });
}
