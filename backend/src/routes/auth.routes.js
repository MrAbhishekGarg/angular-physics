import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  login,
  logout,
  me,
  signup,
  createMentor,
  listMentors,
  resetMentorPassword,
  removeMentor,
  updateMentorPermissions,
  resetStudentPassword,
  listStudents,
} from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

router.post('/signup', authLimiter, validateBody(['name', 'email', 'password', 'phone']), signup);
router.post('/login', authLimiter, validateBody(['email', 'password']), login);
router.post('/logout', logout);
router.get('/me', authenticate, me);

// Admin-only mentor account management — see plan: shared content pool,
// multiple mentor logins are just extra staff credentials, not siloed
// businesses, so this is purely an auth-layer capability.
router.get('/mentors', authenticate, authorize('admin'), listMentors);
router.post('/mentors', authenticate, authorize('admin'), validateBody(['name', 'email', 'password', 'phone']), createMentor);
router.post('/mentors/:id/reset-password', authenticate, authorize('admin'), validateBody(['newPassword']), resetMentorPassword);
router.delete('/mentors/:id', authenticate, authorize('admin'), removeMentor);
router.patch('/mentors/:id/permissions', authenticate, authorize('admin'), updateMentorPermissions);

// Mentor (or admin, via the authorize() bypass) can reset a student's
// password directly — no email infra exists, so this is relayed out of band.
router.post('/students/:id/reset-password', authenticate, authorize('mentor'), validateBody(['newPassword']), resetStudentPassword);

// Admin-only: every student's login details in one place, mirroring the
// mentor directory above — a raw account list, distinct from AllStudents.jsx
// (which is enrollment-centric and mentor-facing).
router.get('/students', authenticate, authorize('admin'), listStudents);

export default router;
