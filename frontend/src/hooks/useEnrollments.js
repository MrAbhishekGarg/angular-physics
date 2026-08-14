import { useFetch } from './useFetch.js';
import { enrollmentService } from '../services/enrollmentService.js';

export function useMyEnrollments() {
  return useFetch(() => enrollmentService.myEnrollments(), []);
}

export function useAllEnrollments(courseId) {
  return useFetch(() => enrollmentService.listAll(courseId), [courseId]);
}

export function useStudentStats() {
  return useFetch(() => enrollmentService.studentStats(), []);
}

export function useStudentsOverview() {
  return useFetch(() => enrollmentService.studentsOverview(), []);
}
