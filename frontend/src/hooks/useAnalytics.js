import { useFetch } from './useFetch.js';
import { analyticsService } from '../services/analyticsService.js';

export function useMentorAnalytics() {
  return useFetch(() => analyticsService.mentor(), []);
}

export function useStudentAnalytics() {
  return useFetch(() => analyticsService.student(), []);
}

export function useStudentDetailAnalytics(studentId) {
  return useFetch(() => analyticsService.studentDetail(studentId), [studentId]);
}
