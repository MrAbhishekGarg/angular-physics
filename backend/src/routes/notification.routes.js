import { Router } from 'express';
import { listMine, markRead, markAllRead } from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Role-agnostic — any signed-in user reads only their own notifications.
router.use(authenticate);

router.get('/me', listMine);
router.post('/read-all', markAllRead);
router.post('/:id/read', markRead);

export default router;
