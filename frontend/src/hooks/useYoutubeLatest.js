import { useFetch } from './useFetch.js';
import { youtubeService } from '../services/youtubeService.js';

export function useYoutubeLatest() {
  return useFetch(() => youtubeService.getLatest(), []);
}
