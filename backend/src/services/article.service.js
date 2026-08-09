import Article from '../models/Article.js';
import { ApiError } from '../utils/ApiError.js';

function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function getPublishedArticles() {
  return Article.find({ status: 'published' }).sort({ publishedAt: -1 }).lean();
}

export async function getPublishedArticleBySlug(slug) {
  const article = await Article.findOne({ slug, status: 'published' }).lean();
  if (!article) throw new ApiError(404, 'Article not found');
  return article;
}

export async function getAllArticlesForMentor() {
  return Article.find().sort({ createdAt: -1 }).lean();
}

export async function getArticleById(id) {
  const article = await Article.findById(id).lean();
  if (!article) throw new ApiError(404, 'Article not found');
  return article;
}

export async function createArticle(payload) {
  const slug = payload.slug ? slugify(payload.slug) : slugify(payload.title);
  const data = { ...payload, slug };
  if (data.status === 'published' && !data.publishedAt) data.publishedAt = new Date();

  try {
    const article = await Article.create(data);
    return article.toObject();
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, `An article with slug "${slug}" already exists`);
    throw err;
  }
}

export async function updateArticle(id, payload) {
  const data = { ...payload };
  if (data.slug) data.slug = slugify(data.slug);

  const existing = await Article.findById(id).lean();
  if (!existing) throw new ApiError(404, 'Article not found');
  if (data.status === 'published' && existing.status !== 'published' && !data.publishedAt) {
    data.publishedAt = new Date();
  }

  try {
    const article = await Article.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
    return article;
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, `An article with slug "${data.slug}" already exists`);
    throw err;
  }
}

export async function deleteArticle(id) {
  const article = await Article.findByIdAndDelete(id).lean();
  if (!article) throw new ApiError(404, 'Article not found');
  return article;
}

export async function setArticleCoverImage(id, coverImageUrl) {
  const article = await Article.findByIdAndUpdate(id, { coverImageUrl }, { new: true }).lean();
  if (!article) throw new ApiError(404, 'Article not found');
  return article;
}
