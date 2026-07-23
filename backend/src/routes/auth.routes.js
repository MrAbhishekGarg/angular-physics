import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, logout, me, signup } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

router.post('/signup', authLimiter, validateBody(['name', 'email', 'password']), signup);
router.post('/login', authLimiter, validateBody(['email', 'password']), login);
router.post('/logout', logout);
router.get('/me', authenticate, me);

export default router;
