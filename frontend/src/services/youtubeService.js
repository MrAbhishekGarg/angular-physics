import { api } from './api.js';

export const youtubeService = {
  getLatest: () => api.get('/youtube/latest'),
};
