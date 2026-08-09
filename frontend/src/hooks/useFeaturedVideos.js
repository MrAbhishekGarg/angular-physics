import { useFetch } from './useFetch.js';
import { featuredVideoService } from '../services/featuredVideoService.js';

export function useFeaturedVideos() {
  return useFetch(() => featuredVideoService.getAll(), []);
}
