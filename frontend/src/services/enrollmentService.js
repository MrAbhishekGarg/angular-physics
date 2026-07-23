import { api } from './api.js';

export const enrollmentService = {
  enroll: (courseId) => api.post('/enrollments', { courseId }),
  myEnrollments: () => api.get('/enrollments/me'),
  listAll: (courseId) => api.get('/enrollments', { params: courseId ? { courseId } : {} }),
  update: (id, payload) => api.patch(`/enrollments/${id}`, payload),
};
