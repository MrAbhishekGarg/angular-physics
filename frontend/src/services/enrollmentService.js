import { api } from './api.js';

export const enrollmentService = {
  enroll: (courseId) => api.post('/enrollments', { courseId }),
  myEnrollments: () => api.get('/enrollments/me'),
  listAll: (courseId) => api.get('/enrollments', { params: courseId ? { courseId } : {} }),
  studentStats: () => api.get('/enrollments/student-stats'),
  studentsOverview: () => api.get('/enrollments/students-overview'),
  update: (id, payload) => api.patch(`/enrollments/${id}`, payload),
  grantAccess: (studentId, courseId) => api.post('/enrollments/grant-access', { studentId, courseId }),

  // Live-course fee tracking (mentor/admin-managed)
  myFees: () => api.get('/enrollments/me/fees'),
  setFeeConfig: (id, payload) => api.patch(`/enrollments/${id}/fee-config`, payload),
  setSecurityPaid: (id, securityPaid) => api.patch(`/enrollments/${id}/security-paid`, { securityPaid }),
  addPayment: (id, payload) => api.post(`/enrollments/${id}/payments`, payload),
  removePayment: (id, paymentId) => api.delete(`/enrollments/${id}/payments/${paymentId}`),
  addMonthlyEntry: (id, payload) => api.post(`/enrollments/${id}/months`, payload),
  generateMissingMonths: (id) => api.post(`/enrollments/${id}/months/generate`),
  updateMonthlyEntry: (id, monthId, payload) => api.patch(`/enrollments/${id}/months/${monthId}`, payload),
  removeMonthlyEntry: (id, monthId) => api.delete(`/enrollments/${id}/months/${monthId}`),
};
