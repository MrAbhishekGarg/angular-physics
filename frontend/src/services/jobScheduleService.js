import { api } from './api.js';

export const jobScheduleService = {
  listClasses: (filters = {}) => api.get('/job-schedule/classes', { params: filters }),
  listUploads: () => api.get('/job-schedule/uploads'),
  createClass: (payload) => api.post('/job-schedule/classes', payload),
  updateClass: (id, payload) => api.patch(`/job-schedule/classes/${id}`, payload),
  removeClass: (id) => api.delete(`/job-schedule/classes/${id}`),
  removeUpload: (uploadId) => api.delete(`/job-schedule/uploads/${uploadId}`),
  getBatches: () => api.get('/job-schedule/batches'),
  getDashboard: () => api.get('/job-schedule/dashboard'),
  listTopicPlans: (batchCode) => api.get('/job-schedule/topic-plan', { params: batchCode ? { batchCode } : {} }),
  createTopicPlan: (batchCode, title) => api.post('/job-schedule/topic-plan', { batchCode, title }),
  updateTopicPlan: (id, payload) => api.patch(`/job-schedule/topic-plan/${id}`, payload),
  removeTopicPlan: (id) => api.delete(`/job-schedule/topic-plan/${id}`),
  fileUrl: (uploadId) => `${api.defaults.baseURL}/job-schedule/uploads/${uploadId}/file`,
  uploadFile: (file, date) => {
    const formData = new FormData();
    formData.append('pdf', file);
    if (date) formData.append('date', date);
    return api.post('/job-schedule/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
