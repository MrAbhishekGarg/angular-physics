import { Router } from 'express';
import {
  listTestimonialsForMentor,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} from '../controllers/testimonial.controller.js';
import { authenticate, authorize, requireSection } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.get('/', authenticate, authorize('mentor'), requireSection('testimonials'), listTestimonialsForMentor);
router.post('/', authenticate, authorize('mentor'), requireSection('testimonials'), validateBody(['studentName', 'result', 'track', 'quote']), createTestimonial);
router.put('/:id', authenticate, authorize('mentor'), requireSection('testimonials'), updateTestimonial);
router.delete('/:id', authenticate, authorize('mentor'), requireSection('testimonials'), deleteTestimonial);

export default router;
