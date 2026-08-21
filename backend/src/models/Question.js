import mongoose from 'mongoose';
import { TRACKS } from '../constants/tracks.js';

/**
 * The reusable question bank. Every bulk-uploaded or manually-authored
 * question lives here, tagged with examTypes/subject/chapter/topic/
 * difficulty/tags, so Tests can reference the same question by id instead
 * of duplicating it,
 * and students can generate topic/chapter-wise practice from a real
 * filtered pool.
 *
 * Shape mirrors what was previously embedded directly in Test.questions
 * (see git history) — options carry both text and an optional imageUrl
 * since bulk-uploaded questions render a faithful image of the original
 * Word content (equations/symbols/diagrams) alongside the extracted text.
 *
 * correctOptionIndexes/correctNumericAnswer must never reach a student
 * attempting a test — test.service.js strips them before sending a
 * sanitized question list out for attempting. Only mentor-facing reads
 * (the bank itself, or a Test's mentor-facing detail view) return them.
 */
const optionSchema = new mongoose.Schema({ text: { type: String, default: '' }, imageUrl: { type: String } }, { _id: false });

const questionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['mcq-single', 'mcq-multiple', 'numerical'], required: true },
    // Required only when there's no imageUrl either — a screenshot-only
    // question (see bulkCreateFromScreenshotsAndExcel) legitimately has no
    // text at all, and Mongoose's default `required` check for a String
    // path rejects an empty string the same as it rejects undefined, so a
    // plain `required: true` here would silently fail every such question.
    text: {
      type: String,
      required: [function () { return !this.imageUrl; }, 'text is required when the question has no image'],
      default: '',
    },
    imageUrl: { type: String },
    options: { type: [optionSchema], default: [] },
    correctOptionIndexes: { type: [Number], default: [] },
    correctNumericAnswer: { type: Number },
    numericTolerance: { type: Number, default: 0 },
    marks: { type: Number, required: true, default: 4 },
    negativeMarks: { type: Number, required: true, default: 1 },
    // A question can belong to several exams (e.g. a mechanics question
    // useful for both jee-main and neet), exactly one, or none yet — an
    // empty array is a valid, deliberate "unmapped" state, not a data gap.
    // See migrateQuestionExamTypes.js for the one-time migration off the
    // old single-value `examType` field this replaced.
    examTypes: { type: [String], enum: TRACKS, default: [], index: true },
    chapter: { type: String, default: '', trim: true, index: true },
    topic: { type: String, default: '', trim: true },
    // Free text, deliberately not constrained to TRACKS/an enum — this app
    // is Physics-only today, but a question's "subject" is a separate axis
    // from which exam(s) it's mapped to, and is kept open-ended rather than
    // hardcoded to "Physics" in case that ever changes.
    subject: { type: String, default: '', trim: true, index: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    // Previous Year Question tagging — lets mentors pull PYQs into a test
    // deliberately, and lets students generate free PYQ-only practice sets.
    isPYQ: { type: Boolean, default: false },
    pyqYear: { type: Number },
    // Free-text identity tag — a mentor's name, a source ("NCERT", "Allen
    // DPP"), or any other label a mentor wants to filter a paper by. Not
    // tied to the authenticated user/account, since content is shared
    // across all mentors and the "true" author may not be whoever clicked
    // save (e.g. attributing a PYQ to the exam body it came from).
    author: { type: String, default: '', trim: true, index: true },
    // Open-ended labels beyond the fixed fields above — "Revision",
    // "Tricky", "Must Do", whatever a mentor wants to filter a paper by
    // that doesn't fit chapter/topic/difficulty/author.
    tags: { type: [String], default: [], index: true },
    // A question can carry more than one Concept Code (e.g. it genuinely
    // spans two linked topics) — stores the raw code strings, not a ref,
    // since ConceptCode docs can be edited/deleted independently and a
    // stale code here should just stop resolving rather than break a save.
    conceptCodes: { type: [String], default: [], index: true },
  },
  { timestamps: true }
);

export default mongoose.models.Question || mongoose.model('Question', questionSchema);
