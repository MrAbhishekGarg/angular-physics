import mongoose from 'mongoose';

/**
 * A single question + single answer, then closed — no threaded
 * back-and-forth in v1. Either side of the exchange can be text, an image,
 * or both.
 *
 * Deliberately NOT scoped by a mentor's student assignment
 * (User.studentAccessMode/assignedStudentIds) — there's no answering-mentor
 * field here, and this is treated as an open queue any available mentor can
 * pick up, not a "my students only" surface. Don't "fix" this as an
 * oversight without revisiting that decision first.
 */
const doubtSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    worksheetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worksheet' },
    questionText: { type: String, default: '' },
    questionImageUrl: { type: String },
    // 'cleared' is student-initiated ("I understood the mentor's answer"),
    // distinct from 'closed' which is the mentor's own workflow action.
    status: { type: String, enum: ['open', 'answered', 'closed', 'cleared'], default: 'open', index: true },
    answerText: { type: String, default: '' },
    answerImageUrl: { type: String },
    answeredAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.Doubt || mongoose.model('Doubt', doubtSchema);
