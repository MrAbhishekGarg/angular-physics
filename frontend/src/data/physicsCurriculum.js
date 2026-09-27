/**
 * Full JEE/NEET Class 11-12 Physics syllabus — chapter -> topic breakdown.
 * This is the complete reference list, independent of what's actually been
 * uploaded to the Question Bank yet (Question.distinct('chapter'/'topic')
 * only ever reflects content that already exists, so a chapter nobody has
 * written questions for yet would otherwise never appear as an option).
 * Consumers should treat this as the base list and union it with any live
 * question-bank chapters/topics, so newly-tagged content still shows up
 * too — see mergeTopicSources() below.
 */
export const PHYSICS_CURRICULUM = [
  {
    chapter: 'Physical World & Units and Measurements',
    topics: ['Units & Dimensions', 'Significant Figures', 'Errors in Measurement', 'Dimensional Analysis'],
  },
  {
    chapter: 'Motion in a Straight Line',
    topics: ['Distance & Displacement', 'Speed & Velocity', 'Uniform & Non-uniform Acceleration', 'Equations of Motion', 'Graphs of Motion', 'Relative Motion (1D)'],
  },
  {
    chapter: 'Motion in a Plane',
    topics: ['Theory Bits', 'Vectors — Position, Velocity & Acceleration', 'Concept of Relative Velocity', 'Motion of a Boat in a River', 'Oblique Projectile', 'Horizontal Projectile', 'Previous Eamcet Questions', 'Relative Velocity — Advanced', 'More Than One Correct Option', 'Matching Type Questions', 'Passage — Cricket Fielder Throw', 'Uniform Circular Motion'],
  },
  {
    chapter: 'Laws of Motion',
    topics: ["Newton's First Law & Inertia", "Newton's Second Law", "Newton's Third Law", 'Friction', 'Circular Motion Dynamics', 'Connected Bodies & Pulleys', 'Pseudo Force & Non-inertial Frames'],
  },
  {
    chapter: 'Work, Energy and Power',
    topics: ['Work Done by a Force', 'Kinetic & Potential Energy', 'Work-Energy Theorem', 'Conservation of Energy', 'Power', 'Collisions — Elastic & Inelastic'],
  },
  {
    chapter: 'System of Particles and Rotational Motion',
    topics: ['Centre of Mass', 'Torque & Angular Momentum', 'Moment of Inertia', 'Parallel & Perpendicular Axis Theorems', 'Rolling Motion', 'Equilibrium of Rigid Bodies'],
  },
  {
    chapter: 'Gravitation',
    topics: ["Newton's Law of Gravitation", 'Acceleration due to Gravity & Variation', 'Gravitational Potential Energy', 'Escape Velocity', "Kepler's Laws", 'Satellites & Orbital Velocity'],
  },
  {
    chapter: 'Mechanical Properties of Solids',
    topics: ['Stress & Strain', "Hooke's Law & Young's Modulus", 'Bulk & Shear Modulus', 'Elastic Potential Energy'],
  },
  {
    chapter: 'Mechanical Properties of Fluids',
    topics: ['Pressure & Pascal\'s Law', 'Archimedes\' Principle & Buoyancy', 'Fluid Flow & Continuity Equation', "Bernoulli's Theorem", 'Viscosity & Surface Tension'],
  },
  {
    chapter: 'Thermal Properties of Matter',
    topics: ['Temperature & Thermal Expansion', 'Calorimetry', 'Change of State & Latent Heat', 'Heat Transfer — Conduction, Convection, Radiation'],
  },
  {
    chapter: 'Thermodynamics',
    topics: ['Zeroth & First Law', 'Thermodynamic Processes', 'Second Law & Entropy', 'Heat Engines & Refrigerators', 'Carnot Cycle'],
  },
  {
    chapter: 'Kinetic Theory of Gases',
    topics: ['Kinetic Theory Postulates', 'Ideal Gas Equation', 'Degrees of Freedom', 'Specific Heat Capacities', 'Mean Free Path & Maxwell Distribution'],
  },
  {
    chapter: 'Oscillations',
    topics: ['Simple Harmonic Motion — Basics', 'SHM Energy', 'Simple & Physical Pendulum', 'Damped & Forced Oscillations', 'Resonance'],
  },
  {
    chapter: 'Waves',
    topics: ['Wave Motion & Types', 'Speed of Wave on a String', 'Superposition & Standing Waves', 'Beats', 'Doppler Effect', 'Organ Pipes'],
  },
  {
    chapter: 'Electric Charges and Fields',
    topics: ["Coulomb's Law", 'Electric Field & Field Lines', 'Electric Dipole', "Gauss's Law", 'Continuous Charge Distributions'],
  },
  {
    chapter: 'Electrostatic Potential and Capacitance',
    topics: ['Electric Potential & Potential Energy', 'Equipotential Surfaces', 'Capacitance & Capacitors', 'Series & Parallel Combination', 'Energy Stored in a Capacitor', 'Dielectrics'],
  },
  {
    chapter: 'Current Electricity',
    topics: ['Current & Charge Flow', 'Drift Velocity', "Ohm's Law & Resistance", 'Temperature Coefficient of Resistance', 'Series & Parallel Combination', 'Resistor Networks', "Kirchhoff's Laws", 'Wheatstone Bridge & Meter Bridge', 'Potentiometer', 'EMF & Internal Resistance'],
  },
  {
    chapter: 'Moving Charges and Magnetism',
    topics: ["Biot-Savart Law", "Ampere's Law", 'Force on a Moving Charge', 'Force on a Current-carrying Conductor', 'Torque on a Current Loop', 'Moving Coil Galvanometer'],
  },
  {
    chapter: 'Magnetism and Matter',
    topics: ['Bar Magnet & Magnetic Dipole', "Earth's Magnetism", 'Magnetic Properties of Materials', 'Para-, Dia- & Ferromagnetism'],
  },
  {
    chapter: 'Electromagnetic Induction',
    topics: ["Faraday's Law", "Lenz's Law", 'Motional EMF', 'Self & Mutual Inductance', 'Eddy Currents'],
  },
  {
    chapter: 'Alternating Current',
    topics: ['AC Voltage & Current Basics', 'AC through R, L, C', 'LCR Series Circuit & Resonance', 'Power in AC Circuits', 'Transformers'],
  },
  {
    chapter: 'Electromagnetic Waves',
    topics: ['Displacement Current', 'EM Wave Properties', 'Electromagnetic Spectrum'],
  },
  {
    chapter: 'Ray Optics and Optical Instruments',
    topics: ['Reflection at Plane & Curved Surfaces', 'Refraction & Snell\'s Law', 'Total Internal Reflection', 'Lenses & Lens Maker\'s Formula', 'Prism', 'Optical Instruments — Microscope & Telescope'],
  },
  {
    chapter: 'Wave Optics',
    topics: ['Huygens Principle', "Young's Double Slit Experiment", 'Interference', 'Diffraction', 'Polarization'],
  },
  {
    chapter: 'Dual Nature of Radiation and Matter',
    topics: ['Photoelectric Effect', "Einstein's Equation", 'De Broglie Wavelength', 'Davisson-Germer Experiment'],
  },
  {
    chapter: 'Atoms',
    topics: [
      "Rutherford's Model",
      "Bohr's Model of Hydrogen Atom",
      'Atomic Spectra',
    ],
  },
  {
    chapter: 'Nuclei',
    topics: ['Nuclear Structure & Size', 'Mass-Energy Relation & Binding Energy', 'Radioactivity', 'Nuclear Fission & Fusion'],
  },
  {
    chapter: 'Semiconductor Electronics',
    topics: ['Energy Bands', 'p-n Junction Diode', 'Diode as Rectifier', 'Transistors', 'Logic Gates'],
  },
  {
    chapter: 'Communication Systems',
    topics: ['Elements of Communication', 'Modulation — AM & FM', 'Bandwidth & Propagation'],
  },
];

/** Flat, deduplicated chapter names from the curriculum alone. */
export const CURRICULUM_CHAPTERS = PHYSICS_CURRICULUM.map((c) => c.chapter);

/** Every curriculum topic, flattened and deduplicated. */
export const CURRICULUM_TOPICS = [...new Set(PHYSICS_CURRICULUM.flatMap((c) => c.topics))];

/** Topics for one chapter (curriculum-only) — used to narrow the Topic field once a Chapter is picked. */
export function topicsForChapter(chapter) {
  return PHYSICS_CURRICULUM.find((c) => c.chapter === chapter)?.topics || [];
}

/**
 * Unions the static curriculum with whatever chapters/topics already exist
 * live in the question bank (from questionService.getTaxonomy()) — so the
 * list is always the full syllabus PLUS anything a mentor has actually
 * tagged, even if it doesn't match the standard curriculum wording exactly
 * (e.g. an exam-specific topic label).
 */
export function mergeTopicSources(liveTaxonomy) {
  const chapters = [...new Set([...CURRICULUM_CHAPTERS, ...(liveTaxonomy?.chapters || [])])].sort();
  const topics = [...new Set([...CURRICULUM_TOPICS, ...(liveTaxonomy?.topics || [])])].sort();
  return { chapters, topics };
}
