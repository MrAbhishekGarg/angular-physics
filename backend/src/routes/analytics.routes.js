import { Router } from 'express';
import { mentorAnalytics, studentAnalytics, studentDetailAnalytics } from '../controllers/analytics.controller.js';
import { authenticate, authorize, requireSection } from '../middleware/auth.js';

const router = Router();

// Deliberately ungated by any section — powers the mentor's always-visible
// Dashboard overview, which is never restrictable.
router.get('/mentor', authenticate, authorize('mentor'), mentorAnalytics);
router.get('/student', authenticate, authorize('student'), studentAnalytics);
router.get('/students/:studentId', authenticate, authorize('mentor'), requireSection('students'), studentDetailAnalytics);

export default router;
