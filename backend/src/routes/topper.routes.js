import { Router } from 'express';
import { listToppers, createTopper, updateTopper, deleteTopper, uploadTopperPhoto } from '../controllers/topper.controller.js';
import { authenticate, authorize, requireSection } from '../middleware/auth.js';
import { uploadContentImage } from '../middleware/upload.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.get('/', listToppers);
router.post('/', authenticate, authorize('mentor'), requireSection('toppers'), validateBody(['name', 'achievement', 'track']), createTopper);
router.put('/:id', authenticate, authorize('mentor'), requireSection('toppers'), updateTopper);
router.delete('/:id', authenticate, authorize('mentor'), requireSection('toppers'), deleteTopper);
router.post('/:id/photo', authenticate, authorize('mentor'), requireSection('toppers'), uploadContentImage, uploadTopperPhoto);

export default router;
