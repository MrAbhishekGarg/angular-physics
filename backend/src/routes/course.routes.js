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
router.get('/mentor', authenticate, authorize('mentor'), requireSection('courses'), listCoursesForMentor);
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
