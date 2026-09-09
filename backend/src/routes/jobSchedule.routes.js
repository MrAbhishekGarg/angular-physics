import { Router } from 'express';
import {
  ingestSchedule,
  listClasses,
  createClass,
  updateClass,
  deleteClass,
  deleteUpload,
  getBatches,
  downloadSchedulePdf,
} from '../controllers/jobSchedule.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadJobSchedulePdf } from '../middleware/upload.js';
import { validateBody } from '../middleware/validate.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

const router = Router();

/**
 * A daily automation (Zapier watching Gmail for the schedule mail) has no
 * session cookie to authenticate with, so this one route uses a shared
 * secret header instead of the normal authenticate/authorize('admin')
 * chain every other route on this router uses. Disabled entirely (503) if
 * SCHEDULE_INGEST_SECRET was never set, rather than silently accepting
 * requests with no real gate.
 */
function requireIngestSecret(req, res, next) {
  if (!env.scheduleIngestSecret) return next(new ApiError(503, 'Schedule ingestion is not configured'));
  if (req.get('X-Ingest-Secret') !== env.scheduleIngestSecret) return next(new ApiError(401, 'Invalid ingest secret'));
  next();
}

router.post('/ingest', requireIngestSecret, uploadJobSchedulePdf, ingestSchedule);

// Everything else is the mentor's own admin-only view of his day job —
// same authorize('admin') gate as the existing /dashboard/mentor/admin/*
// pages (AdminMentors/AdminStudents), never reachable by the plain mentor
// account used for the actual business.
router.use(authenticate, authorize('admin'));

router.get('/classes', listClasses);
router.post('/classes', validateBody(['date', 'startTime', 'batchCode']), createClass);
router.patch('/classes/:id', updateClass);
router.delete('/classes/:id', deleteClass);
router.post('/upload', uploadJobSchedulePdf, ingestSchedule);
router.get('/batches', getBatches);
router.get('/uploads/:id/pdf', downloadSchedulePdf);
router.delete('/uploads/:id', deleteUpload);

export default router;
