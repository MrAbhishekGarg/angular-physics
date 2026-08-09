import { api } from './api.js';

export const testimonialService = {
  getAll: () => api.get('/testimonials'),
  create: (payload) => api.post('/testimonials', payload),
  update: (id, payload) => api.put(`/testimonials/${id}`, payload),
  remove: (id) => api.delete(`/testimonials/${id}`),
};
