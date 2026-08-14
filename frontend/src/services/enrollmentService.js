import { api } from './api.js';

export const enrollmentService = {
  enroll: (courseId) => api.post('/enrollments', { courseId }),
  myEnrollments: () => api.get('/enrollments/me'),
  listAll: (courseId) => api.get('/enrollments', { params: courseId ? { courseId } : {} }),
  studentStats: () => api.get('/enrollments/student-stats'),
  studentsOverview: () => api.get('/enrollments/students-overview'),
  update: (id, payload) => api.patch(`/enrollments/${id}`, payload),
  grantAccess: (studentId, courseId) => api.post('/enrollments/grant-access', { studentId, courseId }),
};
