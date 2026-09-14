import { Router } from 'express';
import {
  listBatches,
  createBatch,
  updateBatch,
  deleteBatch,
  createStudent,
  updateStudent,
  deleteStudent,
  addPayment,
  removePayment,
  addMonthPayment,
  updateMonthPayment,
  removeMonthPayment,
  registerStudentAccount,
  sendFeeReminder,
  addClassLog,
  updateClassLog,
  removeClassLog,
  addUpcomingTopic,
  removeUpcomingTopic,
  addUpcomingTest,
  removeUpcomingTest,
  addUpcomingWorksheet,
  removeUpcomingWorksheet,
  getMyCourseFee,
  getMySchedule,
  claimMonthPayment,
} from '../controllers/courseFees.controller.js';
import { authenticate, authorize, requireSection } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

// Student self-service — registered before the blanket mentor gate below so
// these never hit it, same mixed-auth-per-route pattern as doubt.routes.js.
router.get('/me', authenticate, authorize('student'), getMyCourseFee);
router.get('/me/schedule', authenticate, authorize('student'), getMySchedule);
router.post('/me/months/:monthId/claim', authenticate, authorize('student'), claimMonthPayment);

// A real Angular Physics business feature (fee tracking for the mentor's
// own live courses, kept manually since it doesn't run through the site's
// automated Razorpay/enrollment flow). Same mentor-facing gate as every
// other business section (worksheets, tests, etc.): admin bypasses via
// authorize()'s built-in admin check, a plain mentor is gated by the
// 'course-fees' restrictedSections key.
router.use(authenticate, authorize('mentor'), requireSection('course-fees'));

router.get('/batches', listBatches);
router.post('/batches', validateBody(['courseId']), createBatch);
router.patch('/batches/:id', updateBatch);
router.delete('/batches/:id', deleteBatch);

router.post('/batches/:batchId/students', validateBody(['name']), createStudent);
router.patch('/students/:id', updateStudent);
router.delete('/students/:id', deleteStudent);

router.post('/students/:id/payments', validateBody(['amount']), addPayment);
router.delete('/students/:id/payments/:paymentId', removePayment);

router.post('/students/:id/months', validateBody(['month']), addMonthPayment);
router.patch('/students/:id/months/:monthId', updateMonthPayment);
router.delete('/students/:id/months/:monthId', removeMonthPayment);

router.post('/students/:id/register', validateBody(['email', 'phone']), registerStudentAccount);
router.post('/students/:id/remind', sendFeeReminder);

router.post('/batches/:batchId/class-logs', validateBody(['date']), addClassLog);
router.patch('/class-logs/:id', updateClassLog);
router.delete('/class-logs/:id', removeClassLog);

router.post('/batches/:batchId/upcoming-topics', validateBody(['title']), addUpcomingTopic);
router.delete('/batches/:batchId/upcoming-topics/:itemId', removeUpcomingTopic);
router.post('/batches/:batchId/upcoming-tests', validateBody(['title']), addUpcomingTest);
router.delete('/batches/:batchId/upcoming-tests/:itemId', removeUpcomingTest);
router.post('/batches/:batchId/upcoming-worksheets', validateBody(['title']), addUpcomingWorksheet);
router.delete('/batches/:batchId/upcoming-worksheets/:itemId', removeUpcomingWorksheet);

export default router;
