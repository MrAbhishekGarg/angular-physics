import * as videoLibraryService from '../services/videoLibrary.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const listPlaylists = asyncHandler(async (req, res) => {
  const playlists = await videoLibraryService.listPlaylists();
  return ApiResponse(res, 200, playlists, { count: playlists.length });
});

export const listVideos = asyncHandler(async (req, res) => {
  const videos = await videoLibraryService.listVideos({ playlistId: req.query.playlistId });
  return ApiResponse(res, 200, videos, { count: videos.length });
});

export const createPlaylist = asyncHandler(async (req, res) => {
  const playlist = await videoLibraryService.createPlaylist(req.body);
  return ApiResponse(res, 201, playlist);
});

export const updatePlaylist = asyncHandler(async (req, res) => {
  const playlist = await videoLibraryService.updatePlaylist(req.params.id, req.body);
  return ApiResponse(res, 200, playlist);
});

export const deletePlaylist = asyncHandler(async (req, res) => {
  await videoLibraryService.deletePlaylist(req.params.id);
  return ApiResponse(res, 200, { deleted: true });
});

export const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const video = await videoLibraryService.addVideoToPlaylist(req.params.playlistId, req.params.videoId);
  return ApiResponse(res, 200, video);
});

export const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const video = await videoLibraryService.removeVideoFromPlaylist(req.params.playlistId, req.params.videoId);
  return ApiResponse(res, 200, video);
});

export const syncFromYoutube = asyncHandler(async (req, res) => {
  const summary = await videoLibraryService.syncFromYoutube();
  return ApiResponse(res, 200, summary);
});
