import Lead from '../models/Lead.js';
import { isDbConnected } from '../config/db.js';

/**
 * In seed-mode (no DB configured) leads are logged, not persisted —
 * keeps local dev functional without silently losing real submissions
 * once a real database is wired up.
 */
export async function createLead(payload) {
  if (isDbConnected()) {
    const lead = await Lead.create(payload);
    return lead.toObject();
  }
  console.log('[lead:seed-mode] Would save lead:', payload);
  return { ...payload, id: `seed-${Date.now()}` };
}
