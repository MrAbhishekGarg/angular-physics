import { Router } from 'express';
import {
  listNotes,
  listPublicNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  uploadNoteFile,
  downloadNote,
  downloadPublicNote,
} from '../controllers/note.controller.js';
import { authenticate, authorize, requireSection } from '../middleware/auth.js';
import { uploadNoteFile as uploadMiddleware } from '../middleware/upload.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const REQUIRED_NOTE_FIELDS = ['title', 'description', 'track', 'category'];

// Static paths before /:id, or Express would swallow "public" as an :id.
router.get('/public', listPublicNotes);
router.get('/', authenticate, listNotes);
router.get('/:id/download-public', downloadPublicNote);
router.get('/:id', authenticate, getNote);
router.get('/:id/download', authenticate, downloadNote);

router.post('/', authenticate, authorize('mentor'), requireSection('notes'), validateBody(REQUIRED_NOTE_FIELDS), createNote);
router.put('/:id', authenticate, authorize('mentor'), requireSection('notes'), updateNote);
router.delete('/:id', authenticate, authorize('mentor'), requireSection('notes'), deleteNote);
router.post('/:id/file', authenticate, authorize('mentor'), requireSection('notes'), uploadMiddleware, uploadNoteFile);

export default router;
