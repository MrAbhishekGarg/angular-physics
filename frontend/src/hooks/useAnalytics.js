import { useFetch } from './useFetch.js';
import { analyticsService } from '../services/analyticsService.js';

export function useMentorAnalytics() {
  return useFetch(() => analyticsService.mentor(), []);
}

export function useStudentAnalytics() {
  return useFetch(() => analyticsService.student(), []);
}
