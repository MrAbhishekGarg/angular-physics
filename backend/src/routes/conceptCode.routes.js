import { Router } from 'express';
import {
  listConceptCodes,
  createConceptCode,
  updateConceptCode,
  deleteConceptCode,
  bulkUploadConceptCodes,
} from '../controllers/conceptCode.controller.js';
import { authenticate, authorize, requireSection } from '../middleware/auth.js';
import { uploadConceptCodesExcel } from '../middleware/upload.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.get('/', authenticate, authorize('mentor'), requireSection('concept-codes'), listConceptCodes);
router.post('/bulk-upload', authenticate, authorize('mentor'), requireSection('concept-codes'), uploadConceptCodesExcel, bulkUploadConceptCodes);
router.post('/', authenticate, authorize('mentor'), requireSection('concept-codes'), validateBody(['code', 'label']), createConceptCode);
router.put('/:id', authenticate, authorize('mentor'), requireSection('concept-codes'), updateConceptCode);
router.delete('/:id', authenticate, authorize('mentor'), requireSection('concept-codes'), deleteConceptCode);

export default router;
