import { api } from './api.js';

export const worksheetService = {
  getAll: (params) => api.get('/worksheets', { params }),
  getById: (id) => api.get(`/worksheets/${id}`),
  create: (payload) => api.post('/worksheets', payload),
  update: (id, payload) => api.put(`/worksheets/${id}`, payload),
  remove: (id) => api.delete(`/worksheets/${id}`),
  uploadFile: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/worksheets/${id}/file`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  assign: (id, courseIds) => api.post(`/worksheets/${id}/assign`, { courseIds }),
  getAvailable: () => api.get('/worksheets/available'),
  downloadUrl: (id) => `${api.defaults.baseURL}/worksheets/${id}/download`,
  complete: (id) => api.post(`/worksheets/${id}/complete`),
  getProgress: (id) => api.get(`/worksheets/${id}/progress`),
};
