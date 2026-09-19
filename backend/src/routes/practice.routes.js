import { Router } from 'express';
import { getCategories, getMyProfile, getAdminStats, resetProfile } from '../controllers/practice.controller.js';
import { authenticate, authorize, requireSection } from '../middleware/auth.js';

const router = Router();

router.get('/categories', authenticate, authorize('student'), getCategories);
router.get('/my-profile', authenticate, authorize('student'), getMyProfile);

// Admin/mentor "full control" view — gated the same way the rest of the
// student-facing test/analytics data is (requireSection is a no-op for admin).
router.get('/admin/stats', authenticate, authorize('mentor'), requireSection('students'), getAdminStats);
router.post('/admin/students/:studentId/reset', authenticate, authorize('admin'), resetProfile);

export default router;
