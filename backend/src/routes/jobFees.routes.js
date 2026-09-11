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
} from '../controllers/jobFees.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

// The mentor's own manual fee ledger for his live/recorded courses — same
// admin-only isolation as the rest of "My Job" (jobSchedule.routes.js).
router.use(authenticate, authorize('admin'));

router.get('/batches', listBatches);
router.post('/batches', validateBody(['name']), createBatch);
router.patch('/batches/:id', updateBatch);
router.delete('/batches/:id', deleteBatch);

router.post('/batches/:batchId/students', validateBody(['name']), createStudent);
router.patch('/students/:id', updateStudent);
router.delete('/students/:id', deleteStudent);

router.post('/students/:id/payments', validateBody(['amount']), addPayment);
router.delete('/students/:id/payments/:paymentId', removePayment);

export default router;
