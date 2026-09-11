import { api } from './api.js';

export const jobFeesService = {
  listBatches: () => api.get('/job-fees/batches'),
  createBatch: (payload) => api.post('/job-fees/batches', payload),
  updateBatch: (id, payload) => api.patch(`/job-fees/batches/${id}`, payload),
  removeBatch: (id) => api.delete(`/job-fees/batches/${id}`),

  createStudent: (batchId, payload) => api.post(`/job-fees/batches/${batchId}/students`, payload),
  updateStudent: (id, payload) => api.patch(`/job-fees/students/${id}`, payload),
  removeStudent: (id) => api.delete(`/job-fees/students/${id}`),

  addPayment: (studentId, payload) => api.post(`/job-fees/students/${studentId}/payments`, payload),
  removePayment: (studentId, paymentId) => api.delete(`/job-fees/students/${studentId}/payments/${paymentId}`),
};
