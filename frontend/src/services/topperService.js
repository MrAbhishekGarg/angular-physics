import { api } from './api.js';

export const topperService = {
  getAll: () => api.get('/toppers'),
  create: (payload) => api.post('/toppers', payload),
  update: (id, payload) => api.put(`/toppers/${id}`, payload),
  remove: (id) => api.delete(`/toppers/${id}`),
  uploadPhoto: (id, file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post(`/toppers/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
