import { Router } from 'express';
import {
  listCourses,
  getFeaturedCourses,
  getCourseBySlug,
  listTestimonials,
  createCourse,
  updateCourse,
  deleteCourse,
  uploadCourseImage,
} from '../controllers/course.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadCourseImage as uploadMiddleware } from '../middleware/upload.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const REQUIRED_COURSE_FIELDS = ['slug', 'title', 'track', 'tagline', 'description', 'price', 'durationWeeks'];

router.get('/', listCourses);
router.get('/featured', getFeaturedCourses);
router.get('/testimonials', listTestimonials);
router.get('/:slug', getCourseBySlug);

router.post('/', authenticate, authorize('mentor'), validateBody(REQUIRED_COURSE_FIELDS), createCourse);
router.put('/:id', authenticate, authorize('mentor'), updateCourse);
router.delete('/:id', authenticate, authorize('mentor'), deleteCourse);
router.post('/:id/image', authenticate, authorize('mentor'), uploadMiddleware, uploadCourseImage);

export default router;
