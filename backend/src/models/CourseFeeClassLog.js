import mongoose from 'mongoose';

/**
 * One actually-taught class for a CourseFeeBatch — admin-entered after the
 * fact, same spirit as "My Job"'s JobClass. This is what "number of
 * classes/hours taught" and "topics covered" (item 9) are computed from;
 * `classHoursPerWeek` on CourseFeeBatch stays a weekly-plan estimate, not a
 * cumulative count.
 */
const courseFeeClassLogSchema = new mongoose.Schema(
  {
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseFeeBatch', required: true, index: true },
    date: { type: Date, required: true },
    hours: { type: Number, default: 1 },
    topicsCovered: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.CourseFeeClassLog || mongoose.model('CourseFeeClassLog', courseFeeClassLogSchema);
