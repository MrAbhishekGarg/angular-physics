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
};

if (!process.env.JWT_SECRET) {
  console.warn('[env] No JWT_SECRET set — auth tokens will not be secure. Set JWT_SECRET in .env.');
}
