import { api } from './api.js';

export const videoLibraryService = {
  listPlaylists: () => api.get('/video-library/playlists'),
  listVideos: (playlistId) => api.get('/video-library/videos', { params: playlistId ? { playlistId } : {} }),
  createPlaylist: (payload) => api.post('/video-library/playlists', payload),
  updatePlaylist: (id, payload) => api.put(`/video-library/playlists/${id}`, payload),
  removePlaylist: (id) => api.delete(`/video-library/playlists/${id}`),
  addVideoToPlaylist: (playlistId, videoId) => api.post(`/video-library/playlists/${playlistId}/videos/${videoId}`),
  removeVideoFromPlaylist: (playlistId, videoId) => api.delete(`/video-library/playlists/${playlistId}/videos/${videoId}`),
  syncFromYoutube: () => api.post('/video-library/sync'),
};
