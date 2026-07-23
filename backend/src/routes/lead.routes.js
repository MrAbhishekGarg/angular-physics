import { Router } from 'express';
import { createLead } from '../controllers/lead.controller.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.post('/', validateBody(['name', 'email']), createLead);

export default router;
