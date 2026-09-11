import mongoose from 'mongoose';

/**
 * A single class from the mentor's Aakash day job — either auto-extracted
 * from a daily schedule PDF (see scheduleGridParser.js/jobSchedule.service.js)
 * or added by hand. Fully isolated from every Angular Physics business
 * model; this module exists purely so he can track and review his own
 * teaching job, not to run the business.
 */
const jobClassSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, index: true },
    dayOfWeek: { type: String, default: '' },
    // Plain "H:MM"/"HH:MM" strings, verbatim from the source PDF — these
    // are always India wall-clock time with no AM/PM marker in the source
    // document itself (a coaching schedule's own convention, not ours), so
    // guessing AM/PM here risks a confidently wrong conversion; showing the
    // mentor exactly what the PDF printed is safer than a wrong guess.
    startTime: { type: String, required: true },
    endTime: { type: String, default: '' },
    room: { type: String, default: '' },
    batchCode: { type: String, required: true, trim: true, index: true },
    subjectPrefix: { type: String, default: '' },
    rawText: { type: String, default: '' },
    // What the mentor intends to cover — set while the class is still
    // upcoming ("topics to be taught").
    plannedTopics: { type: String, default: '' },
    // What was actually covered — the post-class record ("topics covered
    // and taught").
    topicsCovered: { type: String, default: '' },
    notes: { type: String, default: '' },
    // A doubt-clearing session rather than a regular teaching slot — the
    // Aakash grid sometimes lists these under a "Doubt" column whose cell
    // still names the real batch in parentheses (see scheduleGridParser.js).
    isDoubt: { type: Boolean, default: false },
    // Set once the mentor has done the post-class review (confirmed what
    // was actually taught). A past class that isn't reviewed yet shows as
    // "review pending".
    reviewed: { type: Boolean, default: false },
    // True on auto-ingest until the mentor edits the row or explicitly
    // clears it — the PDF parser is a best-effort heuristic against a
    // complex, human-formatted grid, not a guaranteed-exact reader. This is
    // the extraction-confidence flag, distinct from `reviewed` above.
    needsReview: { type: Boolean, default: false },
    source: { type: String, enum: ['pdf', 'manual'], default: 'manual' },
    sourceUploadId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobScheduleUpload', default: null },
  },
  { timestamps: true }
);

export default mongoose.models.JobClass || mongoose.model('JobClass', jobClassSchema);
