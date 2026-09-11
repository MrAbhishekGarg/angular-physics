import { Router } from 'express';
import {
  ingestSchedule,
  listClasses,
  listUploads,
  createClass,
  updateClass,
  deleteClass,
  deleteUpload,
  getBatches,
  updateBatch,
  deleteBatch,
  getDashboard,
  listTopicPlans,
  createTopicPlan,
  updateTopicPlan,
  deleteTopicPlan,
  downloadScheduleFile,
} from '../controllers/jobSchedule.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadJobScheduleFile } from '../middleware/upload.js';
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

router.post('/ingest', requireIngestSecret, uploadJobScheduleFile, ingestSchedule);

// Everything else is the mentor's own admin-only view of his day job —
// same authorize('admin') gate as the existing /dashboard/mentor/admin/*
// pages (AdminMentors/AdminStudents), never reachable by the plain mentor
// account used for the actual business.
router.use(authenticate, authorize('admin'));

router.get('/classes', listClasses);
router.post('/classes', validateBody(['date', 'startTime', 'batchCode']), createClass);
router.patch('/classes/:id', updateClass);
router.delete('/classes/:id', deleteClass);
router.get('/uploads', listUploads);
router.post('/upload', uploadJobScheduleFile, ingestSchedule);
router.get('/uploads/:id/file', downloadScheduleFile);
router.delete('/uploads/:id', deleteUpload);
router.get('/batches', getBatches);
router.patch('/batches/:code', updateBatch);
router.delete('/batches/:code', deleteBatch);
router.get('/dashboard', getDashboard);

router.get('/topic-plan', listTopicPlans);
router.post('/topic-plan', validateBody(['batchCode', 'title']), createTopicPlan);
router.patch('/topic-plan/:id', updateTopicPlan);
router.delete('/topic-plan/:id', deleteTopicPlan);

export default router;
