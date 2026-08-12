import { Router } from 'express';
import {
  listPlaylists,
  listVideos,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  syncFromYoutube,
} from '../controllers/videoLibrary.controller.js';
import { authenticate, authorize, requireSection } from '../middleware/auth.js';

const router = Router();

router.get('/playlists', listPlaylists);
router.get('/videos', listVideos);

// No validateBody here — `title` is optional when `youtubePlaylistId` is
// given (the service fetches the real title from YouTube); the service
// layer enforces that at least one of the two is present.
router.post('/playlists', authenticate, authorize('mentor'), requireSection('videos'), createPlaylist);
router.put('/playlists/:id', authenticate, authorize('mentor'), requireSection('videos'), updatePlaylist);
router.delete('/playlists/:id', authenticate, authorize('mentor'), requireSection('videos'), deletePlaylist);
router.post('/playlists/:playlistId/videos/:videoId', authenticate, authorize('mentor'), requireSection('videos'), addVideoToPlaylist);
router.delete('/playlists/:playlistId/videos/:videoId', authenticate, authorize('mentor'), requireSection('videos'), removeVideoFromPlaylist);
router.post('/sync', authenticate, authorize('mentor'), requireSection('videos'), syncFromYoutube);

export default router;
