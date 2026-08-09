import { env } from '../config/env.js';

/**
 * Stable synthetic id for the env-configured admin account.
 * It never touches the database — the token's `sub` carries this constant,
 * and both the auth middleware and login flow recognise it directly.
 * Must be a valid 24-char hex ObjectId string: admin's id flows into
 * ObjectId-typed fields (e.g. TestAttempt.studentId when previewing a test),
 * and Mongoose throws a CastError — a 500, not a clean "not found" — if it
 * isn't shaped like one.
 */
export const ADMIN_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

/** True only when both ADMIN_EMAIL and ADMIN_PASSWORD are configured. */
export function isAdminConfigured() {
  return Boolean(env.adminEmail && env.adminPassword);
}

/** Constant-ish credential check for the env admin. */
export function matchesAdminCredentials(email, password) {
  return (
    isAdminConfigured() &&
    email?.toLowerCase().trim() === env.adminEmail &&
    password === env.adminPassword
  );
}

/** The safe (password-free) admin user shape, mirroring toSafeUser(). */
export function adminSafeUser() {
  return { id: ADMIN_ID, name: env.adminName, email: env.adminEmail, role: 'admin' };
}
