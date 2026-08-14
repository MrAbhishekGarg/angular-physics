import fs from 'fs';
import * as noteService from '../services/note.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { assertCanManagePaidContent } from '../utils/mentorAccess.js';

export const listNotes = asyncHandler(async (req, res) => {
  const { track } = req.query;
  const notes = await noteService.getAllNotes({ track });
  return ApiResponse(res, 200, notes, { count: notes.length });
});

export const listPublicNotes = asyncHandler(async (req, res) => {
  const notes = await noteService.getPublicFreeNotes();
  return ApiResponse(res, 200, notes, { count: notes.length });
});

export const getNote = asyncHandler(async (req, res) => {
  const note = await noteService.getNoteById(req.params.id);
  return ApiResponse(res, 200, note);
});

export const createNote = asyncHandler(async (req, res) => {
  if (req.body.category === 'premium') assertCanManagePaidContent(req.user);
  const note = await noteService.createNote(req.body);
  return ApiResponse(res, 201, note);
});

export const updateNote = asyncHandler(async (req, res) => {
  if (req.user.role === 'mentor' && req.user.canManagePaidContent === false) {
    const { category: currentCategory } = await noteService.getNotePaidStatus(req.params.id);
    const nextCategory = req.body.category !== undefined ? req.body.category : currentCategory;
    if (currentCategory === 'premium' || nextCategory === 'premium') assertCanManagePaidContent(req.user);
  }
  const note = await noteService.updateNote(req.params.id, req.body);
  return ApiResponse(res, 200, note);
});

export const deleteNote = asyncHandler(async (req, res) => {
  if (req.user.role === 'mentor' && req.user.canManagePaidContent === false) {
    const { category } = await noteService.getNotePaidStatus(req.params.id);
    if (category === 'premium') assertCanManagePaidContent(req.user);
  }
  await noteService.deleteNote(req.params.id);
  return ApiResponse(res, 200, { deleted: true });
});

export const uploadNoteFile = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No file uploaded');
  const note = await noteService.setNoteFile(req.params.id, {
    fileKey: req.file.filename,
    fileName: req.file.originalname,
    fileType: req.file.mimetype,
    fileSizeBytes: req.file.size,
  });
  return ApiResponse(res, 200, note);
});

export const downloadNote = asyncHandler(async (req, res) => {
  const { absolutePath, fileName, fileType } = await noteService.resolveNoteFileForDownload(
    req.params.id,
    req.user
  );

  if (!fs.existsSync(absolutePath)) throw new ApiError(404, 'File not found on server');

  res.setHeader('Content-Type', fileType);
  res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
  fs.createReadStream(absolutePath).pipe(res);
});

export const downloadPublicNote = asyncHandler(async (req, res) => {
  const { absolutePath, fileName, fileType } = await noteService.resolveFreeNoteFileForDownload(req.params.id);

  if (!fs.existsSync(absolutePath)) throw new ApiError(404, 'File not found on server');

  res.setHeader('Content-Type', fileType);
  res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
  fs.createReadStream(absolutePath).pipe(res);
});
