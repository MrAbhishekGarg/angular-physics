import { api } from './api.js';

export const questionService = {
  list: (filters = {}) => api.get('/questions', { params: filters }),
  getTaxonomy: (examType) => api.get('/questions/taxonomy', { params: examType ? { examType } : {} }),
  get: (id) => api.get(`/questions/${id}`),
  create: (payload) => api.post('/questions', payload),
  update: (id, payload) => api.put(`/questions/${id}`, payload),
  remove: (id) => api.delete(`/questions/${id}`),
  bulkUpload: (file, { examType, chapter, topic, difficulty, isPYQ, pyqYear, author, subject, tags }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (examType) formData.append('examType', examType);
    if (chapter) formData.append('chapter', chapter);
    if (topic) formData.append('topic', topic);
    if (difficulty) formData.append('difficulty', difficulty);
    if (isPYQ) formData.append('isPYQ', 'true');
    if (isPYQ && pyqYear) formData.append('pyqYear', pyqYear);
    if (author) formData.append('author', author);
    if (subject) formData.append('subject', subject);
    if (tags) formData.append('tags', tags);
    return api.post('/questions/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  bulkUploadMapped: (docxFile, excelFile, { examType, chapter, topic, difficulty, author, subject, tags }) => {
    const formData = new FormData();
    formData.append('docx', docxFile);
    formData.append('excel', excelFile);
    if (examType) formData.append('examType', examType);
    if (chapter) formData.append('chapter', chapter);
    if (topic) formData.append('topic', topic);
    if (difficulty) formData.append('difficulty', difficulty);
    if (author) formData.append('author', author);
    if (subject) formData.append('subject', subject);
    if (tags) formData.append('tags', tags);
    return api.post('/questions/bulk-upload-mapped', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  bulkUploadScreenshots: (imageFiles, excelFile, { examType, chapter, topic, difficulty, author, subject, tags }) => {
    const formData = new FormData();
    imageFiles.forEach((file) => formData.append('images', file));
    formData.append('excel', excelFile);
    if (examType) formData.append('examType', examType);
    if (chapter) formData.append('chapter', chapter);
    if (topic) formData.append('topic', topic);
    if (difficulty) formData.append('difficulty', difficulty);
    if (author) formData.append('author', author);
    if (subject) formData.append('subject', subject);
    if (tags) formData.append('tags', tags);
    return api.post('/questions/bulk-upload-screenshots', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  generateSet: (payload) => api.post('/questions/generate-set', payload),
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/questions/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
