import { Router } from 'express';
import {
  listTestimonialsForMentor,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} from '../controllers/testimonial.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.get('/', authenticate, authorize('mentor'), listTestimonialsForMentor);
router.post('/', authenticate, authorize('mentor'), validateBody(['studentName', 'result', 'track', 'quote']), createTestimonial);
router.put('/:id', authenticate, authorize('mentor'), updateTestimonial);
router.delete('/:id', authenticate, authorize('mentor'), deleteTestimonial);

export default router;
