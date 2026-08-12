import { Router } from 'express';
import {
  listWorksheets,
  getWorksheet,
  createWorksheet,
  updateWorksheet,
  deleteWorksheet,
  uploadWorksheetFile,
  assignWorksheet,
  listAvailableWorksheets,
  downloadWorksheet,
  completeWorksheet,
  getWorksheetProgress,
} from '../controllers/worksheet.controller.js';
import { authenticate, authorize, requireSection } from '../middleware/auth.js';
import { uploadWorksheetFile as uploadMiddleware } from '../middleware/upload.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.get('/available', authenticate, listAvailableWorksheets);
router.get('/:id/download', authenticate, downloadWorksheet);
router.post('/:id/complete', authenticate, completeWorksheet);

router.get('/', authenticate, authorize('mentor'), requireSection('worksheets'), listWorksheets);
router.get('/:id/progress', authenticate, authorize('mentor'), requireSection('worksheets'), getWorksheetProgress);
router.get('/:id', authenticate, authorize('mentor'), requireSection('worksheets'), getWorksheet);
router.post('/', authenticate, authorize('mentor'), requireSection('worksheets'), validateBody(['title', 'type']), createWorksheet);
router.put('/:id', authenticate, authorize('mentor'), requireSection('worksheets'), updateWorksheet);
router.delete('/:id', authenticate, authorize('mentor'), requireSection('worksheets'), deleteWorksheet);
router.post('/:id/file', authenticate, authorize('mentor'), requireSection('worksheets'), uploadMiddleware, uploadWorksheetFile);
router.post('/:id/assign', authenticate, authorize('mentor'), requireSection('worksheets'), assignWorksheet);

export default router;
