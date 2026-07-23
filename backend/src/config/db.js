import mongoose from 'mongoose';
import { env } from './env.js';

let isConnected = false;

/**
 * Connects to MongoDB if MONGODB_URI is configured.
 * If not, the app runs on in-memory seed data (see src/data/seed.js) —
 * this keeps local dev / demos frictionless without requiring a DB.
 */
export async function connectDB() {
  if (!env.mongoUri) {
    console.warn('[db] No MONGODB_URI set — running on in-memory seed data.');
    return false;
  }

  try {
    await mongoose.connect(env.mongoUri);
    isConnected = true;
    console.log('[db] MongoDB connected');
    return true;
  } catch (err) {
    console.error('[db] MongoDB connection failed, falling back to seed data:', err.message);
    return false;
  }
}

export function isDbConnected() {
  return isConnected;
}
