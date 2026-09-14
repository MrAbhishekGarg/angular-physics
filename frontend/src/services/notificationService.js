import { api } from './api.js';

export const notificationService = {
  getMine: () => api.get('/notifications/me'),
  markRead: (id) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};
