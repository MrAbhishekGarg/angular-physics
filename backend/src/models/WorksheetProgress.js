import mongoose from 'mongoose';

/**
 * Tracks one student's engagement with one Worksheet (DPP/Assignment PDF):
 * when they downloaded it, when they self-reported it as completed (there's
 * no way to track PDF reading progress, so completion is student-attested),
 * and the doubt they raised about it, if any.
 */
const worksheetProgressSchema = new mongoose.Schema(
  {
    worksheetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worksheet', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    downloadedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    doubtId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doubt', default: null },
  },
  { timestamps: true }
);

worksheetProgressSchema.index({ worksheetId: 1, studentId: 1 }, { unique: true });

export default mongoose.models.WorksheetProgress || mongoose.model('WorksheetProgress', worksheetProgressSchema);
