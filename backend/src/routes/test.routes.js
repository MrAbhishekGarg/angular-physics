import { Router } from 'express';
import {
  listTestsMentor,
  getTestMentor,
  createTest,
  updateTest,
  deleteTest,
  listAvailableTests,
  startAttempt,
  submitAttempt,
  saveAttemptProgress,
  listAttemptsForTest,
  getAttendanceForTest,
  getQuestionAnalysisForTest,
  listMyAttempts,
  getAttemptResult,
  resetAttempt,
  createPracticeTest,
  downloadTestPdf,
  downloadTestAnswerPdf,
} from '../controllers/test.controller.js';
import { authenticate, authorize, requireSection } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const REQUIRED_TEST_FIELDS = ['title', 'examType', 'durationMinutes'];

// Student-facing (static paths first, matching the course.routes.js convention)
router.get('/available', authenticate, authorize('student'), listAvailableTests);
router.get('/attempts/me', authenticate, authorize('student'), listMyAttempts);
router.get('/attempts/:attemptId/result', authenticate, getAttemptResult);
// Not role-restricted to 'student' — a mentor previewing their own test
// reuses this same start/submit flow (see test.service.js's startAttempt),
// which is what makes /dashboard/mentor/tests/:id/preview work at all.
router.post('/attempts/:attemptId/submit', authenticate, submitAttempt);
router.post('/attempts/:attemptId/progress', authenticate, saveAttemptProgress);
router.post('/attempts/:attemptId/reset', authenticate, authorize('mentor'), requireSection('tests'), resetAttempt);
router.post('/practice', authenticate, authorize('student'), validateBody(['examType']), createPracticeTest);
router.post('/:id/start', authenticate, startAttempt);

// Mentor CRUD
router.get('/', authenticate, authorize('mentor'), requireSection('tests'), listTestsMentor);
router.get('/:id', authenticate, authorize('mentor'), requireSection('tests'), getTestMentor);
router.get('/:id/attempts', authenticate, authorize('mentor'), requireSection('tests'), listAttemptsForTest);
router.get('/:id/attendance', authenticate, authorize('mentor'), requireSection('tests'), getAttendanceForTest);
router.get('/:id/question-analysis', authenticate, authorize('mentor'), requireSection('tests'), getQuestionAnalysisForTest);
router.get('/:id/pdf', authenticate, authorize('mentor'), requireSection('tests'), downloadTestPdf);
router.get('/:id/answer-pdf', authenticate, authorize('mentor'), requireSection('tests'), downloadTestAnswerPdf);
router.post('/', authenticate, authorize('mentor'), requireSection('tests'), validateBody(REQUIRED_TEST_FIELDS), createTest);
router.put('/:id', authenticate, authorize('mentor'), requireSection('tests'), updateTest);
router.delete('/:id', authenticate, authorize('mentor'), requireSection('tests'), deleteTest);

export default router;
