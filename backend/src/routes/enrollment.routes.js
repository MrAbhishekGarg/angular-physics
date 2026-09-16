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
router.get('/me/fees', authenticate, authorize('student'), enrollmentController.listMyFees);
router.get('/student-stats', authenticate, authorize('mentor'), requireSection('students'), enrollmentController.listStudentStats);
router.get('/students-overview', authenticate, authorize('mentor'), requireSection('students'), enrollmentController.listAllStudentsOverview);
router.get('/', authenticate, authorize('mentor'), requireSection('students'), enrollmentController.listAllEnrollments);
router.patch('/:id', authenticate, authorize('mentor'), requireSection('students'), enrollmentController.update);

// Live-course fee tracking — mentor/admin-managed, see Enrollment.js.
const feeGate = [authenticate, authorize('mentor'), requireSection('students')];
router.patch('/:id/fee-config', ...feeGate, enrollmentController.setFeeConfig);
router.patch('/:id/security-paid', ...feeGate, enrollmentController.setSecurityPaid);
router.post('/:id/payments', ...feeGate, enrollmentController.addPayment);
router.delete('/:id/payments/:paymentId', ...feeGate, enrollmentController.removePayment);
router.post('/:id/months', ...feeGate, enrollmentController.addMonthlyEntry);
router.post('/:id/months/generate', ...feeGate, enrollmentController.generateMissingMonths);
router.patch('/:id/months/:monthId', ...feeGate, enrollmentController.updateMonthlyEntry);
router.delete('/:id/months/:monthId', ...feeGate, enrollmentController.removeMonthlyEntry);
router.post('/:id/fee-reminder', ...feeGate, enrollmentController.sendFeeReminder);
// Admin-only: directly grant a student access to any course, skipping the
// normal pending -> mentor-approval flow — see plan: courses have no
// separate payment gateway/Purchase record like notes/tests do, so
// "granting access" is just setting the Enrollment straight to 'active'.
router.post(
  '/grant-access',
  authenticate,
  authorize('admin'),
  validateBody(['studentId', 'courseId']),
  enrollmentController.grantAccess
);

export default router;
