import { Router } from 'express';
import { getLatestUploads } from '../controllers/youtube.controller.js';

const router = Router();

router.get('/latest', getLatestUploads);

export default router;
