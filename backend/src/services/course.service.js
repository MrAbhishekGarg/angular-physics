import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Testimonial from '../models/Testimonial.js';
import { isDbConnected } from '../config/db.js';
import { seedCourses, seedTestimonials } from '../data/seed.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Service layer: controllers never talk to models or seed data directly.
 * This is the ONE place that decides "DB or seed fallback", so every
 * consumer (controllers, sitemap generator, etc.) automatically benefits
 * without duplicating the branching logic.
 */

export async function getAllCourses({ track } = {}) {
  if (isDbConnected()) {
    const filter = track ? { track } : {};
    return Course.find(filter).sort({ isFeatured: -1, createdAt: -1 }).lean();
  }
  return track ? seedCourses.filter((c) => c.track === track) : seedCourses;
}

export async function getCourseBySlug(slug) {
  const course = isDbConnected()
    ? await Course.findOne({ slug }).lean()
    : seedCourses.find((c) => c.slug === slug);

  if (!course) throw new ApiError(404, `Course "${slug}" not found`);
  return course;
}

export async function getFeaturedCourses() {
  if (isDbConnected()) {
    return Course.find({ isFeatured: true }).lean();
  }
  return seedCourses.filter((c) => c.isFeatured);
}

export async function getAllTestimonials() {
  if (isDbConnected()) {
    return Testimonial.find().sort({ createdAt: -1 }).lean();
  }
  return seedTestimonials;
}

/**
 * Mentor course-management. These are DB-only (no seed-mode branching) —
 * writing courses requires a real account, which already requires the DB.
 */

export async function createCourse(payload) {
  try {
    const course = await Course.create(payload);
    return course.toObject();
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, `A course with slug "${payload.slug}" already exists`);
    throw err;
  }
}

export async function updateCourse(id, payload) {
  const course = await Course.findByIdAndUpdate(id, payload, { new: true, runValidators: true }).lean();
  if (!course) throw new ApiError(404, 'Course not found');
  return course;
}

export async function deleteCourse(id) {
  const hasEnrollments = await Enrollment.exists({ courseId: id });
  if (hasEnrollments) {
    throw new ApiError(409, 'This course has enrollments — close it instead of deleting it');
  }
  const course = await Course.findByIdAndDelete(id).lean();
  if (!course) throw new ApiError(404, 'Course not found');
  return course;
}

export async function setCourseImage(id, imageUrl) {
  const course = await Course.findByIdAndUpdate(id, { imageUrl }, { new: true }).lean();
  if (!course) throw new ApiError(404, 'Course not found');
  return course;
}
