import { Router } from 'express';
import {
  createConcept,
  listConcepts,
  getStats,
  getTopics,
  listPieces,
  getSheetsStatus,
  resyncAll,
  exportExcel,
  updateConcept,
  deleteConcept,
  addPiece,
  updatePieceStatus,
  updatePiece,
  removePiece,
} from '../controllers/contentPlanner.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

// Admin-only throughout — a personal content-planning tool spanning
// YouTube + Instagram: a concept and its several derived pieces, each with
// its own reference id and status (this absorbed the older, separate
// YouTube video tracker module).
const router = Router();

router.get('/', authenticate, authorize('admin'), listConcepts);
router.get('/stats', authenticate, authorize('admin'), getStats);
router.get('/topics', authenticate, authorize('admin'), getTopics);
router.get('/pieces', authenticate, authorize('admin'), listPieces);
router.get('/sheets-status', authenticate, authorize('admin'), getSheetsStatus);
router.get('/export', authenticate, authorize('admin'), exportExcel);
router.post('/resync-all', authenticate, authorize('admin'), resyncAll);
router.post('/', authenticate, authorize('admin'), validateBody(['title']), createConcept);
router.put('/:conceptId', authenticate, authorize('admin'), updateConcept);
router.delete('/:conceptId', authenticate, authorize('admin'), deleteConcept);

router.post('/:conceptId/pieces', authenticate, authorize('admin'), validateBody(['platform', 'type']), addPiece);
router.patch('/:conceptId/pieces/:pieceId/status', authenticate, authorize('admin'), validateBody(['status']), updatePieceStatus);
router.put('/:conceptId/pieces/:pieceId', authenticate, authorize('admin'), updatePiece);
router.delete('/:conceptId/pieces/:pieceId', authenticate, authorize('admin'), removePiece);

export default router;
