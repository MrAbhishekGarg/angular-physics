import { api } from './api.js';

export const jobScheduleService = {
  listClasses: (filters = {}) => api.get('/job-schedule/classes', { params: filters }),
  createClass: (payload) => api.post('/job-schedule/classes', payload),
  updateClass: (id, payload) => api.patch(`/job-schedule/classes/${id}`, payload),
  removeClass: (id) => api.delete(`/job-schedule/classes/${id}`),
  getBatches: () => api.get('/job-schedule/batches'),
  uploadPdf: (file) => {
    const formData = new FormData();
    formData.append('pdf', file);
    return api.post('/job-schedule/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
