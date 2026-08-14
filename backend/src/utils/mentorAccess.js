import { ApiError } from './ApiError.js';

/**
 * Throws 403 if this mentor is scoped to 'selected' students and studentId
 * isn't one of assignedStudentIds. No-op for admins and for mentors left in
 * the default 'all' mode. Not Express route middleware — callers need it
 * either after an async DB lookup (enrollment update) or with a route param
 * that's already in hand (analytics), so it's a plain guard function instead.
 */
export function assertStudentAssigned(user, studentId) {
  if (user?.role !== 'mentor' || user.studentAccessMode !== 'selected') return;
  if (!user.assignedStudentIds?.includes(String(studentId))) {
    throw new ApiError(403, 'Not authorized for this student');
  }
}

/** Mirrors assertStudentAssigned exactly, for courses. */
export function assertCourseAssigned(user, courseId) {
  if (user?.role !== 'mentor' || user.courseAccessMode !== 'selected') return;
  if (!user.assignedCourseIds?.includes(String(courseId))) {
    throw new ApiError(403, 'Not authorized for this course');
  }
}

/**
 * Throws 403 if any of courseIds falls outside a 'selected'-mode mentor's
 * assignedCourseIds — stops a course-scoped mentor from assigning a test or
 * worksheet to a course they don't own. No-op for admins and 'all'-mode
 * mentors.
 */
export function assertCoursesAssigned(user, courseIds = []) {
  if (user?.role !== 'mentor' || user.courseAccessMode !== 'selected') return;
  const invalid = courseIds.filter((cid) => !user.assignedCourseIds?.includes(String(cid)));
  if (invalid.length > 0) {
    throw new ApiError(403, 'Not authorized for one or more of these courses');
  }
}

/**
 * Throws 403 if this mentor lacks canManagePaidContent. Caller decides
 * WHETHER the content in question is paid/premium and only calls this
 * when it is.
 */
export function assertCanManagePaidContent(user) {
  if (user?.role !== 'mentor' || user.canManagePaidContent !== false) return;
  throw new ApiError(403, 'Not authorized to manage paid content');
}
