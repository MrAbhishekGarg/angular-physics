/**
 * Fine-grained action gates within a section a mentor can already see —
 * e.g. hiding "Create Test" while leaving "Edit Test" visible. Mirrors
 * frontend/src/data/mentorActions.js (that file also carries the display
 * label/group for each key; keep both lists in sync).
 */
export const MENTOR_ACTIONS = [
  'questions-create',
  'questions-edit',
  'tests-create',
  'tests-edit',
  'concept-codes-upload',
  'concept-codes-edit',
  'courses-edit',
];
