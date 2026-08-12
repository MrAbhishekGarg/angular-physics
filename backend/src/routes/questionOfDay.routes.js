import { Router } from 'express';
import { getQuestionOfDay, checkQuestionOfDay, setQuestionOfDay } from '../controllers/questionOfDay.controller.js';
import { authenticate, authorize, requireSection } from '../middleware/auth.js';

const router = Router();

router.get('/', getQuestionOfDay);
router.post('/check', checkQuestionOfDay);
router.post('/', authenticate, authorize('mentor'), requireSection('questions'), setQuestionOfDay);

export default router;
