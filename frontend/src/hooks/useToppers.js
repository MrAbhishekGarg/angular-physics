import { useFetch } from './useFetch.js';
import { topperService } from '../services/topperService.js';

export function useToppers() {
  return useFetch(() => topperService.getAll(), []);
}
