import { useFetch } from './useFetch.js';
import { articleService } from '../services/articleService.js';

export function usePublishedArticles() {
  return useFetch(() => articleService.getPublished(), []);
}

export function useArticleBySlug(slug) {
  return useFetch(() => articleService.getBySlug(slug), [slug]);
}

export function useMentorArticles() {
  return useFetch(() => articleService.getAllForMentor(), []);
}
