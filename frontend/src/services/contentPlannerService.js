import { api } from './api.js';

export const contentPlannerService = {
  list: (filters = {}) => api.get('/content-planner', { params: filters }),
  stats: () => api.get('/content-planner/stats'),
  topics: () => api.get('/content-planner/topics'),
  listPieces: (filters = {}) => api.get('/content-planner/pieces', { params: filters }),
  create: (payload) => api.post('/content-planner', payload),
  update: (conceptId, payload) => api.put(`/content-planner/${conceptId}`, payload),
  remove: (conceptId) => api.delete(`/content-planner/${conceptId}`),

  addPiece: (conceptId, payload) => api.post(`/content-planner/${conceptId}/pieces`, payload),
  updatePieceStatus: (conceptId, pieceId, status) =>
    api.patch(`/content-planner/${conceptId}/pieces/${pieceId}/status`, { status }),
  updatePiece: (conceptId, pieceId, payload) => api.put(`/content-planner/${conceptId}/pieces/${pieceId}`, payload),
  removePiece: (conceptId, pieceId) => api.delete(`/content-planner/${conceptId}/pieces/${pieceId}`),

  sheetsStatus: () => api.get('/content-planner/sheets-status'),
  resyncAll: () => api.post('/content-planner/resync-all'),
};
