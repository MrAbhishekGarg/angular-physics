import { api } from './api.js';

export const courseFeesService = {
  listBatches: () => api.get('/course-fees/batches'),
  createBatch: (payload) => api.post('/course-fees/batches', payload),
  updateBatch: (id, payload) => api.patch(`/course-fees/batches/${id}`, payload),
  removeBatch: (id) => api.delete(`/course-fees/batches/${id}`),

  createStudent: (batchId, payload) => api.post(`/course-fees/batches/${batchId}/students`, payload),
  updateStudent: (id, payload) => api.patch(`/course-fees/students/${id}`, payload),
  removeStudent: (id) => api.delete(`/course-fees/students/${id}`),

  addPayment: (studentId, payload) => api.post(`/course-fees/students/${studentId}/payments`, payload),
  removePayment: (studentId, paymentId) => api.delete(`/course-fees/students/${studentId}/payments/${paymentId}`),

  addMonth: (studentId, payload) => api.post(`/course-fees/students/${studentId}/months`, payload),
  updateMonth: (studentId, monthId, payload) => api.patch(`/course-fees/students/${studentId}/months/${monthId}`, payload),
  removeMonth: (studentId, monthId) => api.delete(`/course-fees/students/${studentId}/months/${monthId}`),

  registerStudentAccount: (studentId, payload) => api.post(`/course-fees/students/${studentId}/register`, payload),
};
