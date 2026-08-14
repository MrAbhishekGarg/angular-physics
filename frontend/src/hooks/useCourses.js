import { useFetch } from './useFetch.js';
import { courseService } from '../services/courseService.js';

export function useCourses(track) {
  return useFetch(() => courseService.getAll(track), [track]);
}

export function useMentorCourses() {
  return useFetch(() => courseService.getAllForMentor(), []);
}

export function useFeaturedCourses() {
  return useFetch(() => courseService.getFeatured(), []);
}

export function useCourse(slug) {
  return useFetch(() => courseService.getBySlug(slug), [slug]);
}

export function useTestimonials() {
  return useFetch(() => courseService.getTestimonials(), []);
}
