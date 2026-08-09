import mongoose from 'mongoose';
import { TRACKS } from '../constants/tracks.js';

const testimonialSchema = new mongoose.Schema(
  {
    studentName: { type: String, required: true },
    result: { type: String, required: true }, // e.g. "AIR 47, JEE Advanced 2026"
    track: { type: String, enum: TRACKS, required: true },
    quote: { type: String, required: true },
    videoUrl: { type: String },
    mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.models.Testimonial || mongoose.model('Testimonial', testimonialSchema);
