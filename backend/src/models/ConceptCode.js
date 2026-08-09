import mongoose from 'mongoose';

/**
 * A mentor-maintained taxonomy code (e.g. "PHY-ELEC-045") that maps to a
 * specific chapter/topic. Written next to a question in a bulk upload docx
 * as "[CC:PHY-ELEC-045]" (see questionsDocxParser.js) so each question can
 * be tagged precisely instead of the whole upload batch sharing one
 * chapter/topic. Freely editable — the code itself is just a mentor-chosen
 * label, not a system-generated id. Exam type is set per-question (batch
 * default, Excel row, or docx tag) rather than here, since a code can span
 * questions used across more than one exam track.
 */
const conceptCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },
    label: { type: String, required: true },
    chapter: { type: String, default: '', trim: true },
    topic: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.ConceptCode || mongoose.model('ConceptCode', conceptCodeSchema);
