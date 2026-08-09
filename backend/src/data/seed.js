/**
 * In-memory seed data. Used whenever MongoDB isn't configured, so the
 * frontend always has real data to render — in local dev, demos, or CI.
 * Shape must match backend/src/models/Course.js and Testimonial.js exactly
 * (single source of truth for the "course" shape lives in the Mongoose schema;
 * this file just supplies values).
 */

export const seedCourses = [
  {
    slug: 'jee-main-advanced-2027-crash-course',
    title: 'JEE Main + Advanced 2027 Crash Course',
    track: 'jee-main',
    tagline: 'Master rotational mechanics to modern physics — angle by angle.',
    description:
      'A concept-first crash course covering the full JEE Physics syllabus with problem-solving frameworks Abhishek Kumar Garg has refined across a decade of double-digit AIR results.',
    mentor: 'Abhishek Kumar Garg',
    price: 10999,
    strikePrice: 15999,
    currency: 'INR',
    durationWeeks: 20,
    level: 'Advanced',
    highlights: [
      'Live doubt-solving with Abhishek Garg',
      'Chapter-wise previous year question bank',
      '15 full-length mock tests',
      'Formula sheets + angle-based shortcut techniques',
    ],
    examLogoKey: 'jee-main',
    isFeatured: true,
    status: 'open',
  },
  {
    slug: 'neet-physics-2027-foundation',
    title: 'NEET Physics 2027 Foundation Batch',
    track: 'neet',
    tagline: 'NCERT-anchored Physics built for 180/180.',
    description:
      'A NEET-specific Physics program focused entirely on NCERT-aligned conceptual clarity and speed, mentored end-to-end by Abhishek Kumar Garg.',
    mentor: 'Abhishek Kumar Garg',
    price: 8999,
    strikePrice: 12999,
    currency: 'INR',
    durationWeeks: 24,
    level: 'Intermediate',
    highlights: [
      '100% NCERT-mapped question practice',
      'Weekly full-syllabus tests',
      'Error-log & revision tracker',
      'Live classes + recorded backup',
    ],
    examLogoKey: 'neet',
    isFeatured: true,
    status: 'open',
  },
  {
    slug: 'physics-olympiad-launchpad',
    title: 'Physics Olympiad Launchpad (NSEP/INPhO)',
    track: 'olympiad',
    tagline: 'From NSEP to INPhO — Olympiad-grade problem solving.',
    description:
      'For students aiming beyond JEE/NEET syllabus depth — Olympiad-style problem sets, past papers, and mentorship on advanced mechanics, EM theory and modern physics.',
    mentor: 'Abhishek Kumar Garg',
    price: 12999,
    currency: 'INR',
    durationWeeks: 16,
    level: 'Advanced',
    highlights: [
      'NSEP + INPhO past-paper deep dives',
      'Advanced problem-solving workshops',
      'Small-batch live mentorship',
    ],
    examLogoKey: 'olympiad',
    isFeatured: true,
    status: 'launching-soon',
  },
  {
    slug: 'class-11-physics-foundation',
    title: 'Class 11 Physics Foundation',
    track: 'foundation',
    tagline: 'Build the base every rank depends on.',
    description:
      'Get your fundamentals — kinematics, laws of motion, work-energy-power — rock solid before the syllabus accelerates in Class 12.',
    mentor: 'Abhishek Kumar Garg',
    price: 6999,
    currency: 'INR',
    durationWeeks: 30,
    level: 'Beginner',
    highlights: ['Concept-first teaching', 'Weekly practice sheets', 'Monthly parent progress reports'],
    examLogoKey: 'foundation',
    isFeatured: false,
    status: 'open',
  },
  {
    slug: 'bitsat-physics-crash-course',
    title: 'BITSAT Physics Crash Course',
    track: 'crash-course',
    tagline: 'Speed-focused Physics for BITSAT\'s unique pattern.',
    description:
      'BITSAT rewards speed and accuracy — this crash course drills exactly that with timed sectional tests.',
    mentor: 'Abhishek Kumar Garg',
    price: 5999,
    currency: 'INR',
    durationWeeks: 8,
    level: 'Intermediate',
    highlights: ['Timed sectional drills', 'BITSAT-pattern mocks', 'Rapid revision modules'],
    examLogoKey: 'bitsat',
    isFeatured: false,
    status: 'open',
  },
];

export const seedTestimonials = [
  {
    studentName: 'Ritika Sharma',
    result: 'AIR 63, JEE Advanced',
    track: 'jee-main',
    quote:
      'Abhishek sir\'s way of connecting rotational mechanics to real intuition is the reason Physics went from my weakest to my strongest subject.',
  },
  {
    studentName: 'Devansh Rao',
    result: 'AIR 12, NEET',
    track: 'neet',
    quote:
      'The NCERT-first approach meant nothing on the paper felt unfamiliar. Physics was the section I finished first and trusted most.',
  },
  {
    studentName: 'Ayaan Mehta',
    result: 'AIR 88, JEE Main',
    track: 'jee-main',
    quote: 'The error-log system alone fixed six months of repeated silly mistakes.',
  },
];
