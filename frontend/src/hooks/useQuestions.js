import { useFetch } from './useFetch.js';
import { questionService } from '../services/questionService.js';

export function useQuestions(filters) {
  return useFetch(() => questionService.list(filters), [JSON.stringify(filters)]);
}

export function useQuestionTaxonomy(examType) {
  return useFetch(() => questionService.getTaxonomy(examType), [examType]);
}
