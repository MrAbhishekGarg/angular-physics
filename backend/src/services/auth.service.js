import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { isDbConnected } from '../config/db.js';
import { adminSafeUser, matchesAdminCredentials } from '../utils/adminUser.js';
import { MENTOR_SECTIONS } from '../constants/mentorSections.js';
import { MENTOR_ACTIONS } from '../constants/mentorActions.js';

const SALT_ROUNDS = 10;

function toSafeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    restrictedSections: user.restrictedSections || [],
    studentAccessMode: user.studentAccessMode || 'all',
    assignedStudentIds: (user.assignedStudentIds || []).map((sid) => sid.toString()),
    canResetPasswords: user.canResetPasswords !== false,
    restrictedActions: user.restrictedActions || [],
    courseAccessMode: user.courseAccessMode || 'all',
    assignedCourseIds: (user.assignedCourseIds || []).map((cid) => cid.toString()),
    canManagePaidContent: user.canManagePaidContent !== false,
  };
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

/**
 * Admin-only: sets everything about what a mentor can see/use in one call —
 * sections, student scope, and password-reset ability. Always a full
 * replace (matches how the admin form always sends its complete current
 * state), not a partial merge.
 */
export async function updateMentorPermissions(
  id,
  {
    restrictedSections,
    studentAccessMode,
    assignedStudentIds,
    canResetPasswords,
    restrictedActions,
    courseAccessMode,
    assignedCourseIds,
    canManagePaidContent,
  }
) {
  const keys = Array.isArray(restrictedSections) ? restrictedSections : [];
  const unknown = keys.filter((k) => !MENTOR_SECTIONS.includes(k));
  if (unknown.length > 0) throw new ApiError(400, `Unknown section(s): ${unknown.join(', ')}`);

  const actionKeys = Array.isArray(restrictedActions) ? restrictedActions : [];
  const unknownActions = actionKeys.filter((k) => !MENTOR_ACTIONS.includes(k));
  if (unknownActions.length > 0) throw new ApiError(400, `Unknown action(s): ${unknownActions.join(', ')}`);

  const mode = studentAccessMode === 'selected' ? 'selected' : 'all';
  const ids = Array.isArray(assignedStudentIds) ? assignedStudentIds : [];
  const invalidIds = ids.filter((sid) => !mongoose.Types.ObjectId.isValid(sid));
  if (invalidIds.length > 0) throw new ApiError(400, `Invalid student id(s): ${invalidIds.join(', ')}`);

  const cMode = courseAccessMode === 'selected' ? 'selected' : 'all';
  const courseIds = Array.isArray(assignedCourseIds) ? assignedCourseIds : [];
  const invalidCourseIds = courseIds.filter((cid) => !mongoose.Types.ObjectId.isValid(cid));
  if (invalidCourseIds.length > 0) throw new ApiError(400, `Invalid course id(s): ${invalidCourseIds.join(', ')}`);

  const update = {
    restrictedSections: keys,
    studentAccessMode: mode,
    // Switching back to 'all' clears the list server-side — no stale
    // hidden selection surviving a mode switch.
    assignedStudentIds: mode === 'selected' ? ids : [],
    canResetPasswords: canResetPasswords !== false,
    restrictedActions: actionKeys,
    courseAccessMode: cMode,
    assignedCourseIds: cMode === 'selected' ? courseIds : [],
    canManagePaidContent: canManagePaidContent !== false,
  };

  const user = await User.findOneAndUpdate({ _id: id, role: 'mentor' }, update, { new: true }).lean();
  if (!user) throw new ApiError(404, 'Mentor not found');
  return toSafeUser(user);
}

export { toSafeUser };
