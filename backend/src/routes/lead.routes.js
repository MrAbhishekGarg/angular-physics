import { Router } from 'express';
import { createLead, listLeads } from '../controllers/lead.controller.js';
import { authenticate, authorize, requireSection } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.post('/', validateBody(['name', 'email', 'phone']), createLead);
router.get('/', authenticate, authorize('mentor'), requireSection('enquiries'), listLeads);

export default router;
