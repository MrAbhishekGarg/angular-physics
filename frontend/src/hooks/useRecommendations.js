import { useFetch } from './useFetch.js';
import { recommendationService } from '../services/recommendationService.js';

export function useRecommendations() {
  return useFetch(() => recommendationService.getMine(), []);
}
