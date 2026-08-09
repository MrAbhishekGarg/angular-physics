import { api } from './api.js';

export const recommendationService = {
  getMine: () => api.get('/recommendations/me'),
};
