import { api } from './api.js';

export const testService = {
  // mentor
  listMentor: () => api.get('/tests'),
  getMentor: (id) => api.get(`/tests/${id}`),
  create: (payload) => api.post('/tests', payload),
  update: (id, payload) => api.put(`/tests/${id}`, payload),
  remove: (id) => api.delete(`/tests/${id}`),
  listAttempts: (id) => api.get(`/tests/${id}/attempts`),
  getAttendance: (id) => api.get(`/tests/${id}/attendance`),
  getQuestionAnalysis: (id) => api.get(`/tests/${id}/question-analysis`),
  pdfUrl: (id) => `${api.defaults.baseURL}/tests/${id}/pdf`,
  answerPdfUrl: (id) => `${api.defaults.baseURL}/tests/${id}/answer-pdf`,
  resetAttempt: (attemptId) => api.post(`/tests/attempts/${attemptId}/reset`),

  // student
  listAvailable: () => api.get('/tests/available'),
  start: (id) => api.post(`/tests/${id}/start`),
  submit: (attemptId, payload) => api.post(`/tests/attempts/${attemptId}/submit`, payload),
  saveProgress: (attemptId, payload) => api.post(`/tests/attempts/${attemptId}/progress`, payload),
  myAttempts: () => api.get('/tests/attempts/me'),
  getResult: (attemptId) => api.get(`/tests/attempts/${attemptId}/result`),
  startPractice: (payload) => api.post('/tests/practice', payload),
};
