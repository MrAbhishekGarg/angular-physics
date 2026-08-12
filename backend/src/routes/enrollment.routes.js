import { Router } from 'express';
import * as enrollmentController from '../controllers/enrollment.controller.js';
import { authenticate, authorize, requireSection } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.post(
  '/',
  authenticate,
  authorize('student'),
  validateBody(['courseId']),
  enrollmentController.enroll
);
router.get('/me', authenticate, authorize('student'), enrollmentController.listMyEnrollments);
router.get('/student-stats', authenticate, authorize('mentor'), requireSection('students'), enrollmentController.listStudentStats);
router.get('/', authenticate, authorize('mentor'), requireSection('students'), enrollmentController.listAllEnrollments);
router.patch('/:id', authenticate, authorize('mentor'), requireSection('students'), enrollmentController.update);

export default router;
