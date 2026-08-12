import { Router } from 'express';
import {
  listQuestions,
  getTaxonomy,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  bulkUploadQuestions,
  bulkUploadQuestionsMapped,
  generateQuestionSet,
  uploadQuestionImage,
} from '../controllers/question.controller.js';
import { authenticate, authorize, requireSection } from '../middleware/auth.js';
import {
  uploadQuestionsDocx,
  uploadQuestionsDocxAndExcel,
  uploadQuestionImage as uploadQuestionImageMiddleware,
} from '../middleware/upload.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

// Both roles need this: mentor for bank-management filters, student for the
// topic/chapter-wise practice generator — everything else here stays
// mentor-only (the bank's actual content, including correct answers).
router.get('/taxonomy', authenticate, getTaxonomy);
router.post(
  '/bulk-upload',
  authenticate,
  authorize('mentor'),
  requireSection('questions'),
  uploadQuestionsDocx,
  bulkUploadQuestions
);
router.post(
  '/bulk-upload-mapped',
  authenticate,
  authorize('mentor'),
  requireSection('questions'),
  uploadQuestionsDocxAndExcel,
  bulkUploadQuestionsMapped
);
router.post('/generate-set', authenticate, authorize('mentor'), requireSection('questions'), generateQuestionSet);
router.post('/upload-image', authenticate, authorize('mentor'), requireSection('questions'), uploadQuestionImageMiddleware, uploadQuestionImage);

router.get('/', authenticate, authorize('mentor'), requireSection('questions'), listQuestions);
router.get('/:id', authenticate, authorize('mentor'), requireSection('questions'), getQuestion);
// examType is no longer required — a question can be created fully
// unmapped (examTypes: []) and tagged to an exam later.
router.post('/', authenticate, authorize('mentor'), requireSection('questions'), validateBody(['type', 'text']), createQuestion);
router.put('/:id', authenticate, authorize('mentor'), requireSection('questions'), updateQuestion);
router.delete('/:id', authenticate, authorize('mentor'), requireSection('questions'), deleteQuestion);

export default router;
