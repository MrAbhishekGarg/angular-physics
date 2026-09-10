import mongoose from 'mongoose';

/**
 * A planned topic for one Aakash batch — the mentor's own syllabus
 * checklist, so "topics to be taught" vs "topics already taught" is a real
 * number, not a guess. Isolated from every business model, same as the rest
 * of the "My Job" module.
 */
const jobTopicPlanSchema = new mongoose.Schema(
  {
    batchCode: { type: String, required: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    done: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.JobTopicPlan || mongoose.model('JobTopicPlan', jobTopicPlanSchema);
