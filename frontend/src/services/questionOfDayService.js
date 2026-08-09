import { api } from './api.js';

export const questionOfDayService = {
  get: () => api.get('/question-of-day'),
  check: (answer) => api.post('/question-of-day/check', answer),
  set: (questionId) => api.post('/question-of-day', { questionId }),
};
