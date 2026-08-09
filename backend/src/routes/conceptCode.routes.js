import { Router } from 'express';
import {
  listConceptCodes,
  createConceptCode,
  updateConceptCode,
  deleteConceptCode,
  bulkUploadConceptCodes,
} from '../controllers/conceptCode.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadConceptCodesExcel } from '../middleware/upload.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.get('/', authenticate, authorize('mentor'), listConceptCodes);
router.post('/bulk-upload', authenticate, authorize('mentor'), uploadConceptCodesExcel, bulkUploadConceptCodes);
router.post('/', authenticate, authorize('mentor'), validateBody(['code', 'label']), createConceptCode);
router.put('/:id', authenticate, authorize('mentor'), updateConceptCode);
router.delete('/:id', authenticate, authorize('mentor'), deleteConceptCode);

export default router;
