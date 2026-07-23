/**
 * Single source of truth for exam tracks. Any component that needs to
 * label, filter, or icon-match a track (CourseFilterBar, CourseCard,
 * Navbar dropdown, etc.) imports from here — never re-declares the list.
 */
export const EXAM_TRACKS = [
  { key: 'iit-jee', label: 'IIT-JEE', shortLabel: 'JEE', icon: '📐' },
  { key: 'neet', label: 'NEET', shortLabel: 'NEET', icon: '🧬' },
  { key: 'olympiad', label: 'Physics Olympiad', shortLabel: 'Olympiad', icon: '🏆' },
  { key: 'foundation', label: 'Foundation (Class 9-11)', shortLabel: 'Foundation', icon: '🧱' },
  { key: 'crash-course', label: 'Crash Courses (BITSAT & more)', shortLabel: 'Crash Course', icon: '⚡' },
];

export const getTrackMeta = (key) => EXAM_TRACKS.find((t) => t.key === key);
