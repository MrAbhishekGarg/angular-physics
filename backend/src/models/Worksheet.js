import mongoose from 'mongoose';
import { TRACKS } from '../constants/tracks.js';

/**
 * A DPP or Assignment — a plain downloadable PDF, not an online test.
 * `usageHistory` is append-only: whenever a course is newly added to
 * `courseIds`, an entry is pushed and existing entries are never removed,
 * so "when/where this was used" stays visible even after reassignment.
 */
const worksheetSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: { type: String, enum: ['dpp', 'assignment', 'practice-sheet'], required: true },
    examType: { type: String, enum: TRACKS, default: null },
    chapter: { type: String, default: '', trim: true },
    topic: { type: String, default: '', trim: true },
    // Either uploaded to our own server, or a link to a file the mentor
    // already hosts on Google Drive (saves server storage) — see
    // resolveWorksheetFileForDownload for how the two are served.
    source: { type: String, enum: ['upload', 'drive'], default: 'upload' },
    fileKey: { type: String },
    fileName: { type: String },
    fileSizeBytes: { type: Number },
    driveUrl: { type: String },
    // Optional download/completion deadline for students — null means no
    // deadline (available indefinitely). Mentors can always access their
    // own upload regardless of this.
    deadlineAt: { type: Date, default: null },
    courseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true }],
    // Independent of courseIds — a student sees this worksheet if EITHER
    // their enrolled courses intersect courseIds OR they belong to a batch
    // in batchIds. Batches are plain student groupings, not course-scoped.
    batchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'StudentBatch', index: true }],
    usageHistory: [
      {
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
        assignedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.Worksheet || mongoose.model('Worksheet', worksheetSchema);
