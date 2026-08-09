import { api } from './api.js';

export const conceptCodeService = {
  getAll: () => api.get('/concept-codes'),
  create: (payload) => api.post('/concept-codes', payload),
  update: (id, payload) => api.put(`/concept-codes/${id}`, payload),
  remove: (id) => api.delete(`/concept-codes/${id}`),
  bulkUpload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/concept-codes/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
