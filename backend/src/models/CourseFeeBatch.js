import mongoose from 'mongoose';

/**
 * Fee-tracking wrapper around one real Angular Physics course — every course
 * here is live-taught (no self-paced/recorded catalog exists in this app),
 * so there's no live/recorded distinction to store. `courseId` links back to
 * the actual Course document instead of a freeform batch name, so this is
 * always tied to something real in the catalog. A course can be re-run as
 * more than one live cohort over time, so `courseId` is not unique — several
 * batches may point at the same course.
 *
 * Fee cadence (one-time vs monthly) lives per-student, not here — different
 * students in the same batch can pay differently. `standardFee` is just an
 * optional reference amount (the course's usual price) the mentor may or may
 * not bother setting; when set, it pre-fills a new student's fee so most
 * students don't need it typed in individually.
 */
const courseFeeBatchSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    // Which days of the week this live batch actually meets — a separate
    // axis from the course itself, since the same course can run as a
    // weekday batch for some students and a weekend batch for others.
    scheduleType: { type: String, enum: ['regular', 'weekend', 'semi-weekend'], default: 'regular' },
    standardFee: { type: Number, default: null },
    classHoursPerWeek: { type: Number, default: 0 },
    doubtsPerWeek: { type: Number, default: 0 },
    testsConducted: { type: Number, default: 0 },
    sheetsNotesProvided: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    // Forward-looking plan entries only — actual classes taught (with topics
    // covered) live in CourseFeeClassLog instead. These are plain admin-
    // managed lists, not links into the real Note/Worksheet library.
    upcomingTopics: {
      type: [{ title: { type: String, required: true }, order: { type: Number, default: 0 } }],
      default: [],
    },
    upcomingTests: {
      type: [{ title: { type: String, required: true }, date: { type: Date, default: null } }],
      default: [],
    },
    upcomingWorksheets: {
      type: [{ title: { type: String, required: true }, date: { type: Date, default: null } }],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.models.CourseFeeBatch || mongoose.model('CourseFeeBatch', courseFeeBatchSchema);
