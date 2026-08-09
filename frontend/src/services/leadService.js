import { api } from './api.js';

export const leadService = {
  create: (payload) => api.post('/leads', payload),
  getAll: () => api.get('/leads'),
};
