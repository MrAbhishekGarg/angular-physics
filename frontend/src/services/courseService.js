import { api } from './api.js';

export const courseService = {
  getAll: (track) => api.get('/courses', { params: track ? { track } : {} }),
  getFeatured: () => api.get('/courses/featured'),
  getBySlug: (slug) => api.get(`/courses/${slug}`),
  getTestimonials: () => api.get('/courses/testimonials'),
  create: (payload) => api.post('/courses', payload),
  update: (id, payload) => api.put(`/courses/${id}`, payload),
  remove: (id) => api.delete(`/courses/${id}`),
  uploadImage: (id, file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post(`/courses/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
