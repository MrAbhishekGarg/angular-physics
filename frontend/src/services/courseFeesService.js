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
  sendReminder: (studentId, payload) => api.post(`/course-fees/students/${studentId}/remind`, payload),

  addClassLog: (batchId, payload) => api.post(`/course-fees/batches/${batchId}/class-logs`, payload),
  updateClassLog: (id, payload) => api.patch(`/course-fees/class-logs/${id}`, payload),
  removeClassLog: (id) => api.delete(`/course-fees/class-logs/${id}`),

  addUpcomingTopic: (batchId, payload) => api.post(`/course-fees/batches/${batchId}/upcoming-topics`, payload),
  removeUpcomingTopic: (batchId, itemId) => api.delete(`/course-fees/batches/${batchId}/upcoming-topics/${itemId}`),
  addUpcomingTest: (batchId, payload) => api.post(`/course-fees/batches/${batchId}/upcoming-tests`, payload),
  removeUpcomingTest: (batchId, itemId) => api.delete(`/course-fees/batches/${batchId}/upcoming-tests/${itemId}`),
  addUpcomingWorksheet: (batchId, payload) => api.post(`/course-fees/batches/${batchId}/upcoming-worksheets`, payload),
  removeUpcomingWorksheet: (batchId, itemId) => api.delete(`/course-fees/batches/${batchId}/upcoming-worksheets/${itemId}`),

  // Student self-service — separate auth (authorize('student')) from
  // everything above (authorize('mentor')), see courseFees.routes.js.
  getMine: () => api.get('/course-fees/me'),
  getMySchedule: () => api.get('/course-fees/me/schedule'),
  claimMonth: (monthId) => api.post(`/course-fees/me/months/${monthId}/claim`),
};
