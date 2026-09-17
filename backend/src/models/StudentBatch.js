import mongoose from 'mongoose';

/**
 * A mentor-formed group of registered students, independent of any course —
 * a student can belong to a batch regardless of what they're enrolled in.
 * Notes and Worksheets can target a batch (in addition to, or instead of, a
 * course) to control who sees them — see Note.batchIds/Worksheet.batchIds
 * and the eligibility checks in note.service.js/worksheet.service.js.
 *
 * Named "StudentBatch" (not "Batch") to avoid any confusion with the
 * unrelated JobBatch model, which tracks the mentor's own personal
 * Aakash-coaching teaching schedule — a completely different domain that
 * happens to reuse the word "batch".
 */
const studentBatchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
  },
  { timestamps: true }
);

export default mongoose.models.StudentBatch || mongoose.model('StudentBatch', studentBatchSchema);
