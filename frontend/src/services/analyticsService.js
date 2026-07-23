import { api } from './api.js';

export const analyticsService = {
  mentor: () => api.get('/analytics/mentor'),
  student: () => api.get('/analytics/student'),
};
