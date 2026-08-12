/**
 * The 12 dashboard sections an admin can restrict a mentor from — labels
 * match the nav item text in DashboardLayout.jsx exactly, keys match
 * backend/src/constants/mentorSections.js (keep both lists in sync).
 * Used for nav filtering and for the checkbox grid in AdminMentors.jsx's
 * permissions editor. "Dashboard" itself isn't listed — never restrictable.
 */
export const MENTOR_SECTIONS = [
  { key: 'students', label: 'All Students' },
  { key: 'enquiries', label: 'Enquiries' },
  { key: 'notes', label: 'Notes' },
  { key: 'questions', label: 'Question Bank' },
  { key: 'concept-codes', label: 'Concept Codes' },
  { key: 'articles', label: 'Articles' },
  { key: 'videos', label: 'Videos & Playlists' },
  { key: 'tests', label: 'Tests' },
  { key: 'worksheets', label: 'Worksheets' },
  { key: 'toppers', label: 'Toppers' },
  { key: 'testimonials', label: 'Testimonials' },
  { key: 'doubts', label: 'Doubts' },
];
