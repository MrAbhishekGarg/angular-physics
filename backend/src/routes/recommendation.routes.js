import { Router } from 'express';
import { getMyRecommendations } from '../controllers/recommendation.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/me', authenticate, authorize('student'), getMyRecommendations);

export default router;
