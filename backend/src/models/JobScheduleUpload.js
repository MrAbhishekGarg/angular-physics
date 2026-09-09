import mongoose from 'mongoose';

/**
 * One row per ingested Aakash daily-schedule PDF — audit trail (which file
 * produced which classes) and idempotency guard: a date that already has an
 * upload is rejected rather than silently re-ingested, so a duplicate
 * Zapier fire or an accidental re-upload can never clobber notes the mentor
 * already typed onto that day's JobClass rows. Fully isolated from every
 * business model (Course/Batch/Question/Test) — this whole module tracks
 * the mentor's separate day job, not Angular Physics itself.
 */
const jobScheduleUploadSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, unique: true, index: true },
    originalFilename: { type: String, default: '' },
    storedPath: { type: String, required: true },
    extractedCount: { type: Number, default: 0 },
    warnings: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.JobScheduleUpload || mongoose.model('JobScheduleUpload', jobScheduleUploadSchema);
