/**
 * Preset practice categories (item requested: "PYQ Practice, Advanced
 * Numericals Practice, IRODOV Practice, HC Verma Practice, Theoretical
 * Practice, etc") — each is just a named filter preset over the existing
 * Question fields (isPYQ, author, type, difficulty), not a new content
 * type. `filters` merges into the same params createPracticeTest/
 * generateQuestionSet already accept.
 */
export const PRACTICE_CATEGORIES = [
  {
    key: 'pyq',
    label: 'PYQ Practice',
    icon: '📜',
    description: 'Previous year questions, exactly as they appeared in real exams.',
    filters: { isPYQ: true },
  },
  {
    key: 'advanced-numericals',
    label: 'Advanced Numericals Practice',
    icon: '🧮',
    description: 'Hard, calculation-heavy numerical-answer questions.',
    filters: { type: 'numerical', difficulty: 'hard' },
  },
  {
    key: 'irodov',
    label: 'IRODOV Practice',
    icon: '🧊',
    description: "Questions sourced from Irodov's Problems in General Physics.",
    filters: { author: 'Irodov' },
  },
  {
    key: 'hc-verma',
    label: 'HC Verma Practice',
    icon: '📘',
    description: "Questions sourced from H.C. Verma's Concepts of Physics.",
    filters: { author: 'HC Verma' },
  },
  {
    key: 'theoretical',
    label: 'Theoretical Practice',
    icon: '💡',
    description: 'Concept-based MCQs — no heavy calculation.',
    filters: { type: 'mcq-single' },
  },
];
