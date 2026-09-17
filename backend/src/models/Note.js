import mongoose from 'mongoose';
import { TRACKS } from '../constants/tracks.js';

/**
 * A downloadable notes file (PDF or other document format) — either
 * uploaded to our own server, or a link to a file the mentor already hosts
 * on Google Drive (saves server storage; the same access-control checks
 * still run before a student is handed the link — see
 * resolveNoteFileForDownload). Free notes are downloadable by any
 * authenticated student; premium notes require a paid Purchase record — see
 * payment.service.js's hasPurchased().
 *
 * courseIds/batchIds are an OPTIONAL extra visibility filter, not a
 * requirement — a note with neither set stays visible to every student
 * (the original, still-default behavior), while one with either set narrows
 * visibility to students eligible via at least one assigned course or
 * batch. See getAvailableNotesForStudent for the exact eligibility rule.
 */
const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    track: { type: String, required: true, enum: TRACKS, index: true },
    courseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true }],
    batchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'StudentBatch', index: true }],
    category: { type: String, enum: ['free', 'premium'], default: 'free', required: true },
    price: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    source: { type: String, enum: ['upload', 'drive'], default: 'upload' },
    fileKey: { type: String },
    fileName: { type: String },
    fileType: { type: String },
    fileSizeBytes: { type: Number },
    driveUrl: { type: String },
    mentor: { type: String, default: 'Abhishek Garg' },
  },
  { timestamps: true }
);

export default mongoose.models.Note || mongoose.model('Note', noteSchema);
