import { useFetch } from './useFetch.js';
import { testimonialService } from '../services/testimonialService.js';

export function useMentorTestimonials() {
  return useFetch(() => testimonialService.getAll(), []);
}
