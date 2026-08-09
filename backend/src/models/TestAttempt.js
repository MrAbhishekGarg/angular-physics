import mongoose from 'mongoose';

/**
 * One *active* attempt per student per test — see the partial unique index
 * below. `durationMinutes` is snapshotted from the Test at start time so a
 * later edit to the test's duration can't affect an attempt already in
 * progress. Scoring is always computed server-side in test.service.js at
 * submit time; a client never supplies score/correctCount/etc directly.
 *
 * `questionId` is snapshotted per answer (alongside the position-based
 * questionIndex) so per-chapter/topic mistake analysis on the mentor's
 * student-detail view stays correct even if the test's question list is
 * edited later.
 */
const answerSchema = new mongoose.Schema(
  {
    questionIndex: { type: Number, required: true },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    selectedOptionIndexes: { type: [Number], default: [] },
    numericAnswer: { type: Number },
  },
  { _id: false }
);

const testAttemptSchema = new mongoose.Schema(
  {
    testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    startedAt: { type: Date, required: true },
    submittedAt: { type: Date },
    durationMinutes: { type: Number, required: true },
    answers: { type: [answerSchema], default: [] },
    status: { type: String, enum: ['in-progress', 'submitted'], default: 'in-progress' },
    score: { type: Number },
    maxScore: { type: Number },
    correctCount: { type: Number },
    wrongCount: { type: Number },
    unattemptedCount: { type: Number },
    proctoring: {
      tabSwitchCount: { type: Number, default: 0 },
      blurCount: { type: Number, default: 0 },
      fullscreenExitCount: { type: Number, default: 0 },
      flagged: { type: Boolean, default: false },
    },
    // Set when a mentor resets this attempt to let the student retake the
    // test — kept (not deleted) so it still shows up in attempt history.
    archived: { type: Boolean, default: false },
    // Set when a mentor starts this attempt themselves to preview/QA a
    // test — excluded from attendance and getAttemptsForTest so it never
    // pollutes real student stats.
    isPreview: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Only one *active* (non-archived) attempt per student per test — a
// mentor-reset attempt gets archived:true, freeing the student to start a
// genuinely fresh one without violating this constraint. MongoDB partial
// index filters don't support $ne/$not, only a restricted operator set —
// an exact-match { archived: false } works identically here since the
// field always has an explicit default, never missing.
testAttemptSchema.index(
  { testId: 1, studentId: 1 },
  { unique: true, partialFilterExpression: { archived: false } }
);

export default mongoose.models.TestAttempt || mongoose.model('TestAttempt', testAttemptSchema);
