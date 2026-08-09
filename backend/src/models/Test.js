import mongoose from 'mongoose';
import { TRACKS } from '../constants/tracks.js';

/**
 * An online Test or a self-generated practice session — `kind`
 * distinguishes them but they share every mechanic (attempt, grading,
 * sanitization, PDF export). Questions are referenced from the shared
 * Question bank (see Question.js) rather than embedded, so the same
 * question can be reused across many tests and filtered by chapter/topic
 * for topic-wise practice. A question's marks/negativeMarks always come
 * from the bank entry itself — no per-test override.
 *
 * DPPs/Assignments are NOT a `kind` here — they're plain downloadable PDFs
 * (see Worksheet.js) with no online-attempt mechanic at all.
 */
const testSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    examType: { type: String, required: true, enum: TRACKS, index: true },
    courseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true }],
    durationMinutes: { type: Number, required: true },
    isPaid: { type: Boolean, default: false },
    price: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    // Optional live-until window — null means it stays live indefinitely
    // once published. Only meaningful when status is 'published'.
    liveUntil: { type: Date, default: null },
    // Kept as the flat, authoritative, ordered id list every existing
    // consumer already relies on (grading by questionIndex, PDF export,
    // attendance, question-analysis) — when `sections` is present it's
    // derived by concatenating each section's questionIds server-side
    // (see test.service.js), so nothing downstream needs to change.
    questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    // Shown once before the student starts the exam.
    instructions: { type: String, default: '' },
    // Optional grouping on top of the flat questionIds above — a test with
    // no sections (every test created before this field existed) behaves
    // exactly as before.
    sections: [
      {
        name: { type: String, required: true },
        instructions: { type: String, default: '' },
        questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
      },
    ],
    kind: { type: String, enum: ['test', 'practice'], default: 'test', index: true },
    isProctored: { type: Boolean, default: true },
    // Only set for kind:'practice' — scopes a self-generated practice test
    // to the one student who created it, bypassing the normal
    // course-enrollment eligibility check used for mentor-authored tests.
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true }
);

export default mongoose.models.Test || mongoose.model('Test', testSchema);
