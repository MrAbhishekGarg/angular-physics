import mongoose from 'mongoose';

/**
 * The registry side of a batch code (JobClass.batchCode / JobTopicPlan.batchCode
 * stay the source of truth for "which batches exist" via distinct values —
 * this just attaches a few editable facts to a code: its type, and lets one
 * be created before any class references it. Renaming here cascades to every
 * JobClass/JobTopicPlan row carrying the old code (see updateBatch in
 * jobSchedule.service.js) so the code stays the single join key everywhere.
 */
const jobBatchSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, unique: true, index: true },
    type: { type: String, enum: ['Regular', 'Doubt'], default: 'Regular' },
  },
  { timestamps: true }
);

export default mongoose.models.JobBatch || mongoose.model('JobBatch', jobBatchSchema);
