import { Router } from 'express';
import {
  listCourses,
  getFeaturedCourses,
  getCourseBySlug,
  listTestimonials,
  listCoursesForMentor,
  createCourse,
  updateCourse,
  deleteCourse,
  uploadCourseImage,
} from '../controllers/course.controller.js';
import { authenticate, authorize, requireSection, requireAction } from '../middleware/auth.js';
import { uploadCourseImage as uploadMiddleware } from '../middleware/upload.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const REQUIRED_COURSE_FIELDS = ['slug', 'title', 'track', 'tagline', 'description', 'price', 'durationWeeks'];

router.get('/', listCourses);
router.get('/featured', getFeaturedCourses);
router.get('/testimonials', listTestimonials);
// Static path before /:slug, matching the article.routes.js public/mentor split.
// Deliberately NOT gated by requireSection('courses') — that section governs
// whether a mentor can *manage* courses (the Manage Courses admin block).
// This route answers a different question ("which courses can I see/pick
// from at all"), needed by course-scoped mentors everywhere a course picker
// appears (Manage Courses, Test/Worksheet course assignment), independent
// of whether they can also administer courses themselves.
router.get('/mentor', authenticate, authorize('mentor'), listCoursesForMentor);
router.get('/:slug', getCourseBySlug);

router.post(
  '/',
  authenticate,
  authorize('mentor'),
  requireSection('courses'),
  requireAction('courses-edit'),
  validateBody(REQUIRED_COURSE_FIELDS),
  createCourse
);
router.put('/:id', authenticate, authorize('mentor'), requireSection('courses'), requireAction('courses-edit'), updateCourse);
router.delete('/:id', authenticate, authorize('mentor'), requireSection('courses'), requireAction('courses-edit'), deleteCourse);
router.post(
  '/:id/image',
  authenticate,
  authorize('mentor'),
  requireSection('courses'),
  requireAction('courses-edit'),
  uploadMiddleware,
  uploadCourseImage
);

export default router;
