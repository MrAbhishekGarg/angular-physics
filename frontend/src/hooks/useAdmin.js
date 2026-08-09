import { useFetch } from './useFetch.js';
import { authService } from '../services/authService.js';

export function useMentors() {
  return useFetch(() => authService.listMentors(), []);
}

export function useAdminStudents() {
  return useFetch(() => authService.listStudents(), []);
}
