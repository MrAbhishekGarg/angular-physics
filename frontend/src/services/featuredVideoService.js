import { api } from './api.js';

export const featuredVideoService = {
  getAll: () => api.get('/featured-videos'),
  create: (payload) => api.post('/featured-videos', payload),
  update: (id, payload) => api.put(`/featured-videos/${id}`, payload),
  remove: (id) => api.delete(`/featured-videos/${id}`),
};
