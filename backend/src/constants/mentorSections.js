/**
 * The 12 dashboard sections an admin can restrict a mentor from — mirrors
 * the leaf items in frontend/src/data/mentorSections.js (that file also
 * carries the display label for each key; keep both lists in sync). The
 * "Dashboard" overview itself is deliberately not a key here — it's never
 * restrictable, always the mentor's landing page.
 */
export const MENTOR_SECTIONS = [
  'students',
  'enquiries',
  'notes',
  'questions',
  'concept-codes',
  'articles',
  'videos',
  'tests',
  'worksheets',
  'toppers',
  'testimonials',
  'doubts',
];
