import { useFetch } from './useFetch.js';
import { questionOfDayService } from '../services/questionOfDayService.js';

export function useQuestionOfDay() {
  return useFetch(() => questionOfDayService.get(), []);
}
