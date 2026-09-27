import * as contentPlannerService from '../services/contentPlanner.service.js';
import { isGoogleSheetsConfigured } from '../config/googleSheets.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const createConcept = asyncHandler(async (req, res) => {
  const concept = await contentPlannerService.createConcept(req.body, req.user.name);
  return ApiResponse(res, 201, concept);
});

export const listConcepts = asyncHandler(async (req, res) => {
  const { status, platform, type, search } = req.query;
  const concepts = await contentPlannerService.listConcepts({ status, platform, type, search });
  return ApiResponse(res, 200, concepts, { count: concepts.length });
});

export const getStats = asyncHandler(async (req, res) => {
  const stats = await contentPlannerService.getStats();
  return ApiResponse(res, 200, stats);
});

export const listPieces = asyncHandler(async (req, res) => {
  const { status, platform, type, search } = req.query;
  const rows = await contentPlannerService.listPiecesFlat({ status, platform, type, search });
  return ApiResponse(res, 200, rows, { count: rows.length });
});

export const getTopics = asyncHandler(async (req, res) => {
  const topics = await contentPlannerService.getUsedTopics();
  return ApiResponse(res, 200, topics);
});

export const updateConcept = asyncHandler(async (req, res) => {
  const concept = await contentPlannerService.updateConcept(req.params.conceptId, req.body);
  return ApiResponse(res, 200, concept);
});

export const deleteConcept = asyncHandler(async (req, res) => {
  await contentPlannerService.deleteConcept(req.params.conceptId);
  return ApiResponse(res, 200, { deleted: true });
});

export const addPiece = asyncHandler(async (req, res) => {
  const concept = await contentPlannerService.addPiece(req.params.conceptId, req.body);
  return ApiResponse(res, 201, concept);
});

export const updatePieceStatus = asyncHandler(async (req, res) => {
  const concept = await contentPlannerService.updatePieceStatus(req.params.conceptId, req.params.pieceId, req.body.status);
  return ApiResponse(res, 200, concept);
});

export const updatePiece = asyncHandler(async (req, res) => {
  const concept = await contentPlannerService.updatePiece(req.params.conceptId, req.params.pieceId, req.body);
  return ApiResponse(res, 200, concept);
});

export const removePiece = asyncHandler(async (req, res) => {
  const concept = await contentPlannerService.removePiece(req.params.conceptId, req.params.pieceId);
  return ApiResponse(res, 200, concept);
});

export const getSheetsStatus = asyncHandler(async (req, res) => {
  const configured = isGoogleSheetsConfigured();
  return ApiResponse(res, 200, {
    configured,
    sheetUrl: configured ? `https://docs.google.com/spreadsheets/d/${env.googleSheetsSpreadsheetId}/edit` : null,
  });
});

export const resyncAll = asyncHandler(async (req, res) => {
  const result = await contentPlannerService.resyncAllToSheet();
  return ApiResponse(res, 200, result);
});

export const exportExcel = asyncHandler(async (req, res) => {
  const buffer = await contentPlannerService.exportToExcelBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="content-planner-${new Date().toISOString().slice(0, 10)}.xlsx"`);
  res.send(buffer);
});
