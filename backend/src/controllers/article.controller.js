import * as articleService from '../services/article.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const listPublishedArticles = asyncHandler(async (req, res) => {
  const articles = await articleService.getPublishedArticles();
  return ApiResponse(res, 200, articles, { count: articles.length });
});

export const getPublishedArticle = asyncHandler(async (req, res) => {
  const article = await articleService.getPublishedArticleBySlug(req.params.slug);
  return ApiResponse(res, 200, article);
});

export const listArticlesForMentor = asyncHandler(async (req, res) => {
  const articles = await articleService.getAllArticlesForMentor();
  return ApiResponse(res, 200, articles, { count: articles.length });
});

export const getArticle = asyncHandler(async (req, res) => {
  const article = await articleService.getArticleById(req.params.id);
  return ApiResponse(res, 200, article);
});

export const createArticle = asyncHandler(async (req, res) => {
  const article = await articleService.createArticle(req.body);
  return ApiResponse(res, 201, article);
});

export const updateArticle = asyncHandler(async (req, res) => {
  const article = await articleService.updateArticle(req.params.id, req.body);
  return ApiResponse(res, 200, article);
});

export const deleteArticle = asyncHandler(async (req, res) => {
  await articleService.deleteArticle(req.params.id);
  return ApiResponse(res, 200, { deleted: true });
});

export const uploadArticleCoverImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No image file uploaded');
  const coverImageUrl = `/uploads/content/${req.file.filename}`;
  const article = await articleService.setArticleCoverImage(req.params.id, coverImageUrl);
  return ApiResponse(res, 200, article);
});
