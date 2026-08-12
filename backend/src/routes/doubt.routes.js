import { Router } from 'express';
import {
  createDoubt,
  listMyDoubts,
  listAllDoubts,
  answerDoubt,
  closeDoubt,
  markDoubtCleared,
  deleteDoubt,
  uploadDoubtImage,
} from '../controllers/doubt.controller.js';
import { authenticate, authorize, requireSection } from '../middleware/auth.js';
import { uploadDoubtImage as uploadDoubtImageMiddleware } from '../middleware/upload.js';

const router = Router();

router.get('/me', authenticate, authorize('student'), listMyDoubts);
router.post('/upload-image', authenticate, uploadDoubtImageMiddleware, uploadDoubtImage);

router.get('/', authenticate, authorize('mentor'), requireSection('doubts'), listAllDoubts);
router.post('/', authenticate, authorize('student'), createDoubt);
router.post('/:id/answer', authenticate, authorize('mentor'), requireSection('doubts'), answerDoubt);
router.post('/:id/close', authenticate, authorize('mentor'), requireSection('doubts'), closeDoubt);
router.post('/:id/mark-cleared', authenticate, authorize('student'), markDoubtCleared);
router.delete('/:id', authenticate, authorize('student'), deleteDoubt);

export default router;
