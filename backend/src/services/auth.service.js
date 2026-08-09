import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { isDbConnected } from '../config/db.js';
import { adminSafeUser, matchesAdminCredentials } from '../utils/adminUser.js';

const SALT_ROUNDS = 10;

function toSafeUser(user) {
  return { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
}

export async function registerStudent({ name, email, password, phone }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  try {
    // role is always 'student' here — there is no open public signup for
    // mentor accounts, those are created by an admin (see createMentor).
    const user = await User.create({ name, email, passwordHash, phone, role: 'student' });
    return toSafeUser(user);
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, 'Email already registered');
    throw err;
  }
}

export async function authenticateUser({ email, password }) {
  // Env-configured admin: authenticate directly against ADMIN_EMAIL/ADMIN_PASSWORD.
  // Checked before any DB lookup so admin login works even on in-memory seed data.
  if (matchesAdminCredentials(email, password)) {
    const safeUser = adminSafeUser();
    return { user: safeUser, safeUser };
  }

  // Without a database there are no student/mentor rows to check against —
  // fail fast rather than hanging on a Mongoose buffering timeout.
  if (!isDbConnected()) throw new ApiError(401, 'Invalid email or password');

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
  if (!user) throw new ApiError(401, 'Invalid email or password');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new ApiError(401, 'Invalid email or password');

  return { user, safeUser: toSafeUser(user) };
}

/**
 * Admin-only: create another mentor login. All mentors share the same
 * content pool (courses/tests/question bank) — this just gives a co-teacher
 * their own credentials into the same dashboard, not a separate business.
 */
export async function createMentor({ name, email, password, phone }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  try {
    const user = await User.create({ name, email, passwordHash, phone, role: 'mentor' });
    return toSafeUser(user);
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, 'Email already registered');
    throw err;
  }
}

export async function listMentors() {
  return User.find({ role: 'mentor' }).sort({ createdAt: -1 }).lean();
}

/** Admin-only: every student's login details in one place — name/email/phone/joined. */
export async function listStudents() {
  return User.find({ role: 'student' }).select('name email phone createdAt').sort({ createdAt: -1 }).lean();
}

/**
 * Admin/mentor-initiated direct password reset — no email infrastructure
 * exists in this app, so the caller sets a new password and relays it to
 * the account holder out of band, rather than a self-service "forgot
 * password" email link. `expectedRole` scopes the target — without it, a
 * plain mentor could reset another mentor's password through the
 * student-reset endpoint just by passing a mentor's id.
 */
export async function resetPassword(userId, newPassword, expectedRole) {
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const filter = expectedRole ? { _id: userId, role: expectedRole } : { _id: userId };
  const user = await User.findOneAndUpdate(filter, { passwordHash }, { new: true }).lean();
  if (!user) throw new ApiError(404, 'User not found');
  return toSafeUser(user);
}

export async function removeMentor(id) {
  const user = await User.findOneAndDelete({ _id: id, role: 'mentor' }).lean();
  if (!user) throw new ApiError(404, 'Mentor not found');
  return user;
}

export { toSafeUser };
