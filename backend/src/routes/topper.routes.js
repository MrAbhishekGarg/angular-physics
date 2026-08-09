import { Router } from 'express';
import { listToppers, createTopper, updateTopper, deleteTopper, uploadTopperPhoto } from '../controllers/topper.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadContentImage } from '../middleware/upload.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.get('/', listToppers);
router.post('/', authenticate, authorize('mentor'), validateBody(['name', 'achievement', 'track']), createTopper);
router.put('/:id', authenticate, authorize('mentor'), updateTopper);
router.delete('/:id', authenticate, authorize('mentor'), deleteTopper);
router.post('/:id/photo', authenticate, authorize('mentor'), uploadContentImage, uploadTopperPhoto);

export default router;
