import mongoose from 'mongoose';

/**
 * One of the mentor's own live/recorded course batches — a manual
 * operations ledger (what the batch delivers, how many students, who owes
 * what) kept entirely by hand, since fee collection here doesn't run through
 * the site's automated Razorpay/enrollment flow. A real Angular Physics
 * business model (these are the mentor's own courses, just tracked outside
 * the automated checkout) — not part of the isolated "My Job" Aakash
 * tracker, despite the two having been built in the same session.
 */
const courseFeeBatchSchema = new mongoose.Schema(
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

export default mongoose.models.CourseFeeBatch || mongoose.model('CourseFeeBatch', courseFeeBatchSchema);
