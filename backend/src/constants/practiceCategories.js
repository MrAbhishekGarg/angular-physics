/**
 * Preset practice categories (item requested: "PYQ Practice, Advanced
 * Numericals Practice, IRODOV Practice, HC Verma Practice, Theoretical
 * Practice, etc"). Deliberately tag-driven, not filter-driven: a student
 * never gets to construct their own chapter/topic/difficulty combination
 * (see createPracticeTest in test.service.js) — a category's question pool
 * is entirely whatever the admin/mentor has tagged with `tagValue` in the
 * Question Bank (Question.tags), and grows only as new tagged questions
 * are uploaded. `tagValue` is the exact tag a mentor should add to a
 * question to include it here.
 */
export const PRACTICE_CATEGORIES = [
  {
    key: 'pyq',
    label: 'PYQ Practice',
    icon: '📜',
    description: 'Previous year questions, exactly as they appeared in real exams.',
    tagValue: 'pyq-practice',
    filters: { tag: 'pyq-practice' },
  },
  {
    key: 'advanced-numericals',
    label: 'Advanced Numericals Practice',
    icon: '🧮',
    description: 'Hard, calculation-heavy numerical-answer questions.',
    tagValue: 'advanced-numericals',
    filters: { tag: 'advanced-numericals' },
  },
  {
    key: 'irodov',
    label: 'IRODOV Practice',
    icon: '🧊',
    description: "Questions sourced from Irodov's Problems in General Physics.",
    tagValue: 'irodov',
    filters: { tag: 'irodov' },
  },
  {
    key: 'hc-verma',
    label: 'HC Verma Practice',
    icon: '📘',
    description: "Questions sourced from H.C. Verma's Concepts of Physics.",
    tagValue: 'hc-verma',
    filters: { tag: 'hc-verma' },
  },
  {
    key: 'theoretical',
    label: 'Theoretical Practice',
    icon: '💡',
    description: 'Concept-based questions — no heavy calculation.',
    tagValue: 'theoretical',
    filters: { tag: 'theoretical' },
  },
];
