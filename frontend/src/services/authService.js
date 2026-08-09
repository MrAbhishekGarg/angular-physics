import { api } from './api.js';

export const authService = {
  signup: (payload) => api.post('/auth/signup', payload),
  login: (payload) => api.post('/auth/login', payload),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),

  // Admin-only mentor account management
  listMentors: () => api.get('/auth/mentors'),
  createMentor: (payload) => api.post('/auth/mentors', payload),
  resetMentorPassword: (id, newPassword) => api.post(`/auth/mentors/${id}/reset-password`, { newPassword }),
  removeMentor: (id) => api.delete(`/auth/mentors/${id}`),

  // Mentor (or admin) resetting a student's password
  resetStudentPassword: (id, newPassword) => api.post(`/auth/students/${id}/reset-password`, { newPassword }),

  // Admin-only student login directory
  listStudents: () => api.get('/auth/students'),
};
