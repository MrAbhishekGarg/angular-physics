import User from '../models/User.js';

/**
 * Whether a student currently has access to a given content module
 * ('tests' | 'worksheets' | 'notes'), per User.restrictedStudentAccess —
 * an admin-managed denylist. Defaults to true (unrestricted) when the
 * field is empty/missing, or when the id doesn't resolve to a student at
 * all (mentor/admin callers of shared code paths should never be blocked
 * by a student-only setting).
 */
export async function hasStudentAccess(studentId, module) {
  const user = await User.findById(studentId).select('restrictedStudentAccess role').lean();
  if (!user || user.role !== 'student') return true;
  return !(user.restrictedStudentAccess || []).includes(module);
}
