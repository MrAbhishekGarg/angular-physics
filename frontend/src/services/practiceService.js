import { api } from './api.js';

export const practiceService = {
  getCategories: () => api.get('/practice/categories'),
  getMyProfile: () => api.get('/practice/my-profile'),
  getAdminStats: () => api.get('/practice/admin/stats'),
  resetStudent: (studentId) => api.post(`/practice/admin/students/${studentId}/reset`),
};
