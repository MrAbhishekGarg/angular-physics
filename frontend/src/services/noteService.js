import { api } from './api.js';

export const noteService = {
  getAll: (track) => api.get('/notes', { params: track ? { track } : {} }),
  // Public (no-auth) — homepage "on the house" section.
  getPublicFree: () => api.get('/notes/public'),
  publicDownloadUrl: (id) => `${api.defaults.baseURL}/notes/${id}/download-public`,
  getById: (id) => api.get(`/notes/${id}`),
  create: (payload) => api.post('/notes', payload),
  update: (id, payload) => api.put(`/notes/${id}`, payload),
  remove: (id) => api.delete(`/notes/${id}`),
  uploadFile: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/notes/${id}/file`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  downloadUrl: (id) => `${api.defaults.baseURL}/notes/${id}/download`,
};
