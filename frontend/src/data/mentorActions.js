/**
 * Fine-grained action gates within a section a mentor can already see —
 * keys match backend/src/constants/mentorActions.js (keep both lists in
 * sync). `group` is UI-only, used to cluster related actions in the
 * AdminMentors.jsx permissions editor.
 */
export const MENTOR_ACTIONS = [
  { key: 'questions-create', label: 'Create Questions', group: 'Question Bank' },
  { key: 'questions-edit', label: 'Edit / Delete Questions', group: 'Question Bank' },
  { key: 'tests-create', label: 'Create Tests', group: 'Tests' },
  { key: 'tests-edit', label: 'Edit / Delete Tests', group: 'Tests' },
  { key: 'concept-codes-upload', label: 'Upload / Add Concept Codes', group: 'Concept Codes' },
  { key: 'concept-codes-edit', label: 'Edit / Delete Concept Codes', group: 'Concept Codes' },
  { key: 'courses-edit', label: 'Create / Edit / Delete Courses', group: 'Courses' },
];
