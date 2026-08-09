import { Router } from 'express';
import { mentorAnalytics, studentAnalytics, studentDetailAnalytics } from '../controllers/analytics.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/mentor', authenticate, authorize('mentor'), mentorAnalytics);
router.get('/student', authenticate, authorize('student'), studentAnalytics);
router.get('/students/:studentId', authenticate, authorize('mentor'), studentDetailAnalytics);

export default router;
