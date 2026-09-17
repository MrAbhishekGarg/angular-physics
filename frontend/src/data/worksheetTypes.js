export const WORKSHEET_TYPES = [
  { key: 'dpp', label: 'DPP (Daily Practice Problem)', shortLabel: 'DPP', tone: 'accent' },
  { key: 'assignment', label: 'Assignment', shortLabel: 'Assignment', tone: 'launching' },
  { key: 'practice-sheet', label: 'Practice Sheet', shortLabel: 'Practice Sheet', tone: 'success' },
];

export const WORKSHEET_TYPE_LABEL = Object.fromEntries(WORKSHEET_TYPES.map((t) => [t.key, t.shortLabel]));
export const WORKSHEET_TYPE_TONE = Object.fromEntries(WORKSHEET_TYPES.map((t) => [t.key, t.tone]));
