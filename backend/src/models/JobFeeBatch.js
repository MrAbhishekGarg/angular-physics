import mongoose from 'mongoose';

/**
 * One of the mentor's own live/recorded course batches — a manual
 * operations ledger (what the batch delivers, how many students, who owes
 * what) kept entirely by hand, since fee collection here doesn't run through
 * the site's automated Razorpay/enrollment flow. Isolated from every
 * Angular Physics business model, same as the rest of "My Job" — this is
 * the mentor's own bookkeeping, not the public course catalog.
 */
const jobFeeBatchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['live', 'recorded'], default: 'live' },
    classHoursPerWeek: { type: Number, default: 0 },
    doubtsPerWeek: { type: Number, default: 0 },
    testsConducted: { type: Number, default: 0 },
    sheetsNotesProvided: { type: Number, default: 0 },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.JobFeeBatch || mongoose.model('JobFeeBatch', jobFeeBatchSchema);
