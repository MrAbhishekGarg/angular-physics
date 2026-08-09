import dotenv from 'dotenv';

dotenv.config();

/**
 * Single source of truth for environment configuration.
 * Import `env` anywhere instead of touching `process.env` directly —
 * keeps defaults and parsing logic in exactly one place (DRY).
 */
export const env = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || '',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  siteUrl: process.env.SITE_URL || 'https://www.angularphysics.com',
  isProd: process.env.NODE_ENV === 'production',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Env-configured admin account. Authenticates directly against these values
  // (no database row required), so an admin can always log in — even when the
  // app is running on in-memory seed data with no MONGODB_URI set.
  adminName: process.env.ADMIN_NAME || 'Admin',
  adminEmail: (process.env.ADMIN_EMAIL || '').toLowerCase().trim(),
  adminPassword: process.env.ADMIN_PASSWORD || '',

  // Razorpay (premium notes + paid tests). Payment endpoints return a clear
  // 503 rather than crashing when these are unset — see config/razorpay.js.
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',

  // YouTube Data API (homepage "Latest Uploads" section). The section just
  // shows nothing when these are unset — see services/youtube.service.js.
  youtubeApiKey: process.env.YOUTUBE_API_KEY || '',
  youtubeChannelId: process.env.YOUTUBE_CHANNEL_ID || '',
};

if (!process.env.JWT_SECRET) {
  console.warn('[env] No JWT_SECRET set — auth tokens will not be secure. Set JWT_SECRET in .env.');
}

if (!env.adminEmail || !env.adminPassword) {
  console.warn('[env] No ADMIN_EMAIL/ADMIN_PASSWORD set — the admin login is disabled. Set both in .env to enable it.');
}

if (!env.razorpayKeyId || !env.razorpayKeySecret) {
  console.warn('[env] No RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET set — premium notes and paid tests cannot be purchased until both are set.');
}

if (!env.youtubeApiKey || !env.youtubeChannelId) {
  console.warn('[env] No YOUTUBE_API_KEY/YOUTUBE_CHANNEL_ID set — the homepage "Latest Uploads" section will stay hidden until both are set.');
}
