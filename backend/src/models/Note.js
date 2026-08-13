import mongoose from 'mongoose';
import { TRACKS } from '../constants/tracks.js';

/**
 * A downloadable notes file (PDF or other document format). Free notes are
 * downloadable by any authenticated student; premium notes require a paid
 * Purchase record — see payment.service.js's hasPurchased().
 */
const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    track: { type: String, required: true, enum: TRACKS, index: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
    category: { type: String, enum: ['free', 'premium'], default: 'free', required: true },
    price: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    fileKey: { type: String },
    fileName: { type: String },
    fileType: { type: String },
    fileSizeBytes: { type: Number },
    mentor: { type: String, default: 'Abhishek Garg' },
  },
  { timestamps: true }
);

export default mongoose.models.Note || mongoose.model('Note', noteSchema);
