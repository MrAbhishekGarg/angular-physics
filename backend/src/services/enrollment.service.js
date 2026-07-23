import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import { ApiError } from '../utils/ApiError.js';

const COURSE_FIELDS = 'title slug track price durationWeeks status imageUrl';

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

export async function getAllEnrollments({ courseId } = {}) {
  const filter = courseId ? { courseId } : {};
  return Enrollment.find(filter)
    .populate('courseId', COURSE_FIELDS)
    .populate('studentId', 'name email')
    .sort({ createdAt: -1 })
    .lean();
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
