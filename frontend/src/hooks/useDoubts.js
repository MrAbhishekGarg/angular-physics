import { useFetch } from './useFetch.js';
import { doubtService } from '../services/doubtService.js';

export function useMyDoubts() {
  return useFetch(() => doubtService.myDoubts(), []);
}

export function useAllDoubts(status) {
  return useFetch(() => doubtService.allDoubts(status), [status]);
}
