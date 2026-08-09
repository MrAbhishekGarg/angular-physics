import { useFetch } from './useFetch.js';
import { worksheetService } from '../services/worksheetService.js';

export function useWorksheetProgress(worksheetId, enabled) {
  return useFetch(() => (enabled ? worksheetService.getProgress(worksheetId) : Promise.resolve(null)), [worksheetId, enabled]);
}
