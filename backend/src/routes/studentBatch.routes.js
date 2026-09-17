import { Router } from 'express';
import {
  listBatches,
  getBatch,
  createBatch,
  updateBatch,
  deleteBatch,
  setBatchStudents,
} from '../controllers/studentBatch.controller.js';
import { authenticate, authorize, requireSection } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

// Read access is open to any mentor (no section gate) — Notes/Worksheets
// assignment pickers need the batch list regardless of whether that mentor
// has the "students" section, same as course pickers work today. Managing
// batches themselves (create/rename/delete/membership) is student-roster
// management, so it's gated the same as the rest of the student roster.
router.get('/', authenticate, authorize('mentor'), listBatches);
router.get('/:id', authenticate, authorize('mentor'), getBatch);
router.post('/', authenticate, authorize('mentor'), requireSection('students'), validateBody(['name']), createBatch);
router.put('/:id', authenticate, authorize('mentor'), requireSection('students'), updateBatch);
router.delete('/:id', authenticate, authorize('mentor'), requireSection('students'), deleteBatch);
router.post('/:id/students', authenticate, authorize('mentor'), requireSection('students'), setBatchStudents);

export default router;
