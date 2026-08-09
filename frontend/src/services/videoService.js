import { api } from './api.js';

export const videoService = {
  getForCourse: (courseId) => api.get('/videos', { params: { courseId } }),
  getById: (id) => api.get(`/videos/${id}`),
  create: (payload) => api.post('/videos', payload),
  update: (id, payload) => api.put(`/videos/${id}`, payload),
  remove: (id) => api.delete(`/videos/${id}`),
  uploadFile: (id, file) => {
    const formData = new FormData();
    formData.append('video', file);
    return api.post(`/videos/${id}/file`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  streamUrl: (id) => `${api.defaults.baseURL}/videos/${id}/stream`,
};
