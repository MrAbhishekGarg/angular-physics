import { useFetch } from './useFetch.js';
import { videoService } from '../services/videoService.js';

export function useVideosForCourse(courseId) {
  return useFetch(() => (courseId ? videoService.getForCourse(courseId) : Promise.resolve([])), [courseId]);
}
