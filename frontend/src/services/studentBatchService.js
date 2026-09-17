import { api } from './api.js';

export const studentBatchService = {
  getAll: () => api.get('/student-batches'),
  getById: (id) => api.get(`/student-batches/${id}`),
  create: (payload) => api.post('/student-batches', payload),
  update: (id, payload) => api.put(`/student-batches/${id}`, payload),
  remove: (id) => api.delete(`/student-batches/${id}`),
  setStudents: (id, studentIds) => api.post(`/student-batches/${id}/students`, { studentIds }),
};
