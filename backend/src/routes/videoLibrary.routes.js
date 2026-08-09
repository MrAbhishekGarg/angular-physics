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
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/playlists', listPlaylists);
router.get('/videos', listVideos);

// No validateBody here — `title` is optional when `youtubePlaylistId` is
// given (the service fetches the real title from YouTube); the service
// layer enforces that at least one of the two is present.
router.post('/playlists', authenticate, authorize('mentor'), createPlaylist);
router.put('/playlists/:id', authenticate, authorize('mentor'), updatePlaylist);
router.delete('/playlists/:id', authenticate, authorize('mentor'), deletePlaylist);
router.post('/playlists/:playlistId/videos/:videoId', authenticate, authorize('mentor'), addVideoToPlaylist);
router.delete('/playlists/:playlistId/videos/:videoId', authenticate, authorize('mentor'), removeVideoFromPlaylist);
router.post('/sync', authenticate, authorize('mentor'), syncFromYoutube);

export default router;
