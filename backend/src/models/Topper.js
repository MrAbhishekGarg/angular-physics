import mongoose from 'mongoose';
import { TRACKS } from '../constants/tracks.js';

const topperSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    photoUrl: { type: String, default: null },
    achievement: { type: String, required: true }, // e.g. "AIR 47, JEE Advanced 2026"
    track: { type: String, enum: TRACKS, required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Topper || mongoose.model('Topper', topperSchema);
