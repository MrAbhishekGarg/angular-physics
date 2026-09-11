import mongoose from 'mongoose';

/**
 * Fee-tracking wrapper around one real Angular Physics course — every course
 * here is live-taught (no self-paced/recorded catalog exists in this app),
 * so there's no live/recorded distinction to store. `courseId` links back to
 * the actual Course document instead of a freeform batch name, so this is
 * always tied to something real in the catalog. A course can be re-run as
 * more than one live cohort over time, so `courseId` is not unique — several
 * batches may point at the same course.
 */
const courseFeeBatchSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    // How this batch collects fees — per-student totalFee/payments (see
    // CourseFeeStudent) works the same either way, this is mainly what the
    // mentor sees when deciding what to charge next.
    feeType: { type: String, enum: ['one-time', 'monthly'], default: 'one-time' },
    monthlyAmount: { type: Number, default: 0 },
    classHoursPerWeek: { type: Number, default: 0 },
    doubtsPerWeek: { type: Number, default: 0 },
    testsConducted: { type: Number, default: 0 },
    sheetsNotesProvided: { type: Number, default: 0 },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.CourseFeeBatch || mongoose.model('CourseFeeBatch', courseFeeBatchSchema);
