import { api } from './api.js';

export const articleService = {
  getPublished: () => api.get('/articles'),
  getBySlug: (slug) => api.get(`/articles/${slug}`),
  getAllForMentor: () => api.get('/articles/mentor'),
  getByIdForMentor: (id) => api.get(`/articles/mentor/${id}`),
  create: (payload) => api.post('/articles', payload),
  update: (id, payload) => api.put(`/articles/${id}`, payload),
  remove: (id) => api.delete(`/articles/${id}`),
  uploadCoverImage: (id, file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post(`/articles/${id}/cover-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
