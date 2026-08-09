import { api } from './api.js';

export const doubtService = {
  create: (payload) => api.post('/doubts', payload),
  myDoubts: () => api.get('/doubts/me'),
  allDoubts: (status) => api.get('/doubts', { params: status ? { status } : {} }),
  answer: (id, payload) => api.post(`/doubts/${id}/answer`, payload),
  close: (id) => api.post(`/doubts/${id}/close`),
  markCleared: (id) => api.post(`/doubts/${id}/mark-cleared`),
  remove: (id) => api.delete(`/doubts/${id}`),
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/doubts/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
