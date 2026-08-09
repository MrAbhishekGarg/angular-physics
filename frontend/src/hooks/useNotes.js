import { useFetch } from './useFetch.js';
import { noteService } from '../services/noteService.js';

export function useNotes(track) {
  return useFetch(() => noteService.getAll(track), [track]);
}
