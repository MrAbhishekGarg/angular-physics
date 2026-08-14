import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

const COURSE_FIELDS = 'title slug track price durationWeeks status imageUrl';
const PURCHASED_STATUSES = ['active', 'completed'];

export async function createEnrollment(studentId, courseId) {
  const course = await Course.findById(courseId).lean();
  if (!course) throw new ApiError(404, 'Course not found');
  if (course.status === 'closed') throw new ApiError(400, 'This course is closed for enrollment');

  try {
    const enrollment = await Enrollment.create({ studentId, courseId, status: 'pending' });
    return enrollment.toObject();
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, 'You already enrolled (or requested) this course');
    throw err;
  }
}

export async function getStudentEnrollments(studentId) {
  return Enrollment.find({ studentId }).populate('courseId', COURSE_FIELDS).sort({ createdAt: -1 }).lean();
}

export async function getAllEnrollments({ courseId, studentIds } = {}) {
  const filter = {};
  if (courseId) filter.courseId = courseId;
  // studentIds undefined -> no filter (mentor sees everyone, or admin).
  // studentIds: [] -> $in: [] matches nothing, which is correct: a mentor
  // scoped to 'selected' students with none assigned yet should see none,
  // not fall back to "all".
  if (studentIds) filter.studentId = { $in: studentIds };
  return Enrollment.find(filter)
    .populate('courseId', COURSE_FIELDS)
    .populate('studentId', 'name email')
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Every registered student — including anyone who has never enrolled in a
 * course at all — with their enrollments attached, for the "All Students"
 * page. `getAllEnrollments` above is enrollment-row-per-row and silently
 * omits students with zero enrollments; this is student-row-per-row instead,
 * left-joined against Enrollment so a never-enrolled student still shows up.
 * `studentIds` follows the same undefined=all / []=none semantics used
 * throughout mentorAccess-scoped listings.
 */
export async function getAllStudentsOverview({ studentIds } = {}) {
  const studentFilter = { role: 'student' };
  if (studentIds) studentFilter._id = { $in: studentIds };
  const students = await User.find(studentFilter).select('name email phone createdAt').sort({ createdAt: -1 }).lean();

  const enrollments = await Enrollment.find({ studentId: { $in: students.map((s) => s._id) } })
    .populate('courseId', COURSE_FIELDS)
    .sort({ createdAt: -1 })
    .lean();

  const enrollmentsByStudent = new Map();
  enrollments.forEach((e) => {
    const key = e.studentId.toString();
    if (!enrollmentsByStudent.has(key)) enrollmentsByStudent.set(key, []);
    enrollmentsByStudent.get(key).push(e);
  });

  return students.map((s) => {
    const studentEnrollments = enrollmentsByStudent.get(s._id.toString()) || [];
    return {
      _id: s._id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      createdAt: s.createdAt,
      enrollments: studentEnrollments,
      hasPurchased: studentEnrollments.some((e) => PURCHASED_STATUSES.includes(e.status)),
    };
  });
}

/**
 * Admin-only direct grant: creates (or reactivates) an 'active' enrollment
 * for a student/course pair, skipping the normal pending->mentor-approval
 * flow entirely — for giving a specific student access without them going
 * through (or having gone through) the request step. Upsert on the same
 * unique {studentId, courseId} pair the normal flow uses, so granting access
 * to an already-enrolled (even 'cancelled') student just reactivates it
 * rather than erroring on a duplicate.
 */
export async function grantCourseAccess(studentId, courseId) {
  const [student, course] = await Promise.all([
    User.findOne({ _id: studentId, role: 'student' }).select('_id').lean(),
    Course.findById(courseId).select('_id').lean(),
  ]);
  if (!student) throw new ApiError(404, 'Student not found');
  if (!course) throw new ApiError(404, 'Course not found');

  const enrollment = await Enrollment.findOneAndUpdate(
    { studentId, courseId },
    { status: 'active' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
    .populate('courseId', COURSE_FIELDS)
    .populate('studentId', 'name email')
    .lean();
  return enrollment;
}

/** Used only to check a mentor's student-assignment before an update. */
export async function getEnrollmentById(id) {
  const enrollment = await Enrollment.findById(id).select('studentId').lean();
  if (!enrollment) throw new ApiError(404, 'Enrollment not found');
  return enrollment;
}

export async function updateEnrollment(id, { status, progressPercent }) {
  const update = {};
  if (status !== undefined) update.status = status;
  if (progressPercent !== undefined) update.progressPercent = progressPercent;

  const enrollment = await Enrollment.findByIdAndUpdate(id, update, { new: true })
    .populate('courseId', COURSE_FIELDS)
    .populate('studentId', 'name email')
    .lean();

  if (!enrollment) throw new ApiError(404, 'Enrollment not found');
  return enrollment;
}
