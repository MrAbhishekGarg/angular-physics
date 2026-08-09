import { useFetch } from './useFetch.js';
import { worksheetService } from '../services/worksheetService.js';

export function useWorksheets(params) {
  return useFetch(() => worksheetService.getAll(params), [JSON.stringify(params || {})]);
}

export function useAvailableWorksheets() {
  return useFetch(() => worksheetService.getAvailable(), []);
}
