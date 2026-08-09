import { Router } from 'express';
import {
  listVideosForCourse,
  getVideo,
  createVideo,
  updateVideo,
  deleteVideo,
  uploadVideoFile,
  streamVideo,
} from '../controllers/video.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadVideoFile as uploadMiddleware } from '../middleware/upload.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.get('/', authenticate, listVideosForCourse);
router.get('/:id', authenticate, getVideo);
router.get('/:id/stream', authenticate, streamVideo);

router.post('/', authenticate, authorize('mentor'), validateBody(['courseId', 'title', 'source']), createVideo);
router.put('/:id', authenticate, authorize('mentor'), updateVideo);
router.delete('/:id', authenticate, authorize('mentor'), deleteVideo);
router.post('/:id/file', authenticate, authorize('mentor'), uploadMiddleware, uploadVideoFile);

export default router;
