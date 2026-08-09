import { Router } from 'express';
import {
  listPublishedArticles,
  getPublishedArticle,
  listArticlesForMentor,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
  uploadArticleCoverImage,
} from '../controllers/article.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadContentImage } from '../middleware/upload.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.get('/', listPublishedArticles);
router.get('/mentor', authenticate, authorize('mentor'), listArticlesForMentor);
router.get('/mentor/:id', authenticate, authorize('mentor'), getArticle);
router.get('/:slug', getPublishedArticle);

router.post('/', authenticate, authorize('mentor'), validateBody(['title', 'excerpt', 'body']), createArticle);
router.put('/:id', authenticate, authorize('mentor'), updateArticle);
router.delete('/:id', authenticate, authorize('mentor'), deleteArticle);
router.post('/:id/cover-image', authenticate, authorize('mentor'), uploadContentImage, uploadArticleCoverImage);

export default router;
