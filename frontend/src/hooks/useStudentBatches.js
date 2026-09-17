import { useFetch } from './useFetch.js';
import { studentBatchService } from '../services/studentBatchService.js';

export function useStudentBatches() {
  return useFetch(() => studentBatchService.getAll(), []);
}
