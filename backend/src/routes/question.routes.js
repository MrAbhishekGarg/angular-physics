import { Router } from 'express';
import {
  listQuestions,
  getTaxonomy,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  bulkDeleteQuestions,
  bulkUploadQuestionsScreenshots,
  bulkUploadQuestionsExcelScreenshots,
  bulkUploadQuestionsDocxScreenshots,
  commitExtractedQuestions,
  generateQuestionSet,
  uploadQuestionImage,
} from '../controllers/question.controller.js';
import { authenticate, authorize, requireSection, requireAction } from '../middleware/auth.js';
import {
  uploadQuestionScreenshotBatch,
  uploadQuestionExcelWithImages,
  uploadQuestionDocxScreenshots,
  uploadQuestionImage as uploadQuestionImageMiddleware,
} from '../middleware/upload.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

// Both roles need this: mentor for bank-management filters, student for the
// topic/chapter-wise practice generator — everything else here stays
// mentor-only (the bank's actual content, including correct answers).
router.get('/taxonomy', authenticate, getTaxonomy);
router.post(
  '/bulk-upload-screenshots',
  authenticate,
  authorize('mentor'),
  requireSection('questions'),
  requireAction('questions-create'),
  uploadQuestionScreenshotBatch,
  bulkUploadQuestionsScreenshots
);
router.post(
  '/bulk-upload-excel-screenshots',
  authenticate,
  authorize('mentor'),
  requireSection('questions'),
  requireAction('questions-create'),
  uploadQuestionExcelWithImages,
  bulkUploadQuestionsExcelScreenshots
);
router.post(
  '/bulk-upload-docx-screenshots',
  authenticate,
  authorize('mentor'),
  requireSection('questions'),
  requireAction('questions-create'),
  uploadQuestionDocxScreenshots,
  bulkUploadQuestionsDocxScreenshots
);
router.post(
  '/commit-extracted',
  authenticate,
  authorize('mentor'),
  requireSection('questions'),
  requireAction('questions-create'),
  uploadQuestionExcelWithImages,
  commitExtractedQuestions
);
router.post('/generate-set', authenticate, authorize('mentor'), requireSection('questions'), requireAction('questions-create'), generateQuestionSet);
router.post(
  '/upload-image',
  authenticate,
  authorize('mentor'),
  requireSection('questions'),
  requireAction('questions-create'),
  uploadQuestionImageMiddleware,
  uploadQuestionImage
);

router.get('/', authenticate, authorize('mentor'), requireSection('questions'), listQuestions);
router.get('/:id', authenticate, authorize('mentor'), requireSection('questions'), getQuestion);
// examType is no longer required — a question can be created fully
// unmapped (examTypes: []) and tagged to an exam later.
// text alone used to be required here, but a screenshot-only question
// (stem/options pasted as images, no typed text) legitimately has an empty
// text — the Question model itself already enforces "text is required only
// when there's no imageUrl" (Question.js), so the route only checks type.
router.post(
  '/',
  authenticate,
  authorize('mentor'),
  requireSection('questions'),
  requireAction('questions-create'),
  validateBody(['type']),
  createQuestion
);
router.put('/:id', authenticate, authorize('mentor'), requireSection('questions'), requireAction('questions-edit'), updateQuestion);
router.delete('/:id', authenticate, authorize('mentor'), requireSection('questions'), requireAction('questions-edit'), deleteQuestion);
router.post('/bulk-delete', authenticate, authorize('mentor'), requireSection('questions'), requireAction('questions-edit'), bulkDeleteQuestions);

export default router;
