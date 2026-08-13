import mongoose from 'mongoose';
import { TRACKS } from '../constants/tracks.js';

/**
 * A single course/batch offered on Angular Physics.
 * Every course is mentored by Abhishek Garg — `mentor` defaults accordingly
 * but is kept as a field (not hardcoded) so guest faculty can be added later
 * without a schema change.
 */
const courseSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    track: {
      type: String,
      required: true,
      enum: TRACKS,
      index: true,
    },
    tagline: { type: String, required: true },
    description: { type: String, required: true },
    mentor: { type: String, default: 'Abhishek Garg' },
    price: { type: Number, required: true },
    strikePrice: { type: Number },
    currency: { type: String, default: 'INR' },
    durationWeeks: { type: Number, required: true },
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Intermediate' },
    highlights: { type: [String], default: [] },
    examLogoKey: { type: String }, // key into a frontend icon map, keeps API decoupled from asset paths
    imageUrl: { type: String, default: null },
    isFeatured: { type: Boolean, default: false },
    status: { type: String, enum: ['open', 'launching-soon', 'closed'], default: 'open' },
  },
  { timestamps: true }
);

export default mongoose.models.Course || mongoose.model('Course', courseSchema);
