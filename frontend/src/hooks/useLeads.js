import { useFetch } from './useFetch.js';
import { leadService } from '../services/leadService.js';

export function useLeads() {
  return useFetch(() => leadService.getAll(), []);
}
