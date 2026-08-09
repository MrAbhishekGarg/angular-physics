import { Router } from 'express';
import {
  listFeaturedVideos,
  createFeaturedVideo,
  updateFeaturedVideo,
  deleteFeaturedVideo,
} from '../controllers/featuredVideo.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.get('/', listFeaturedVideos);
router.post('/', authenticate, authorize('mentor'), validateBody(['youtubeVideoId', 'title']), createFeaturedVideo);
router.put('/:id', authenticate, authorize('mentor'), updateFeaturedVideo);
router.delete('/:id', authenticate, authorize('mentor'), deleteFeaturedVideo);

export default router;
