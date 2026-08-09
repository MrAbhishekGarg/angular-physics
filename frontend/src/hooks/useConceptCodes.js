import { useFetch } from './useFetch.js';
import { conceptCodeService } from '../services/conceptCodeService.js';

export function useConceptCodes() {
  return useFetch(() => conceptCodeService.getAll(), []);
}
