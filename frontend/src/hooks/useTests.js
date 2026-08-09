import { useFetch } from './useFetch.js';
import { testService } from '../services/testService.js';

export function useMentorTests() {
  return useFetch(() => testService.listMentor(), []);
}

export function useAvailableTests() {
  return useFetch(() => testService.listAvailable(), []);
}

export function useMyTestAttempts() {
  return useFetch(() => testService.myAttempts(), []);
}
