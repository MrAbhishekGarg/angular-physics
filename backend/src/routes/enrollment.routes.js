import { Router } from 'express';
import * as enrollmentController from '../controllers/enrollment.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
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
router.get('/', authenticate, authorize('mentor'), enrollmentController.listAllEnrollments);
router.patch('/:id', authenticate, authorize('mentor'), enrollmentController.update);

export default router;
