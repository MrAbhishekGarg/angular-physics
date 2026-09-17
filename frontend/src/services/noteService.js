import { api } from './api.js';

export const noteService = {
  getAll: (track) => api.get('/notes', { params: track ? { track } : {} }),
  // Student-facing — respects per-student notes access and each note's
  // optional course/batch targeting, unlike getAll (the mentor's full list).
  getAvailable: () => api.get('/notes/available'),
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
  setDriveLink: (id, driveUrl) => api.patch(`/notes/${id}/drive-link`, { driveUrl }),
  assignCourses: (id, courseIds) => api.post(`/notes/${id}/assign-courses`, { courseIds }),
  assignBatches: (id, batchIds) => api.post(`/notes/${id}/assign-batches`, { batchIds }),
  downloadUrl: (id) => `${api.defaults.baseURL}/notes/${id}/download`,
};
