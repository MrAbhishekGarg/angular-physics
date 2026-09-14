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
    // 'one-time' uses price/strikePrice below; 'monthly' uses monthlyFee —
    // kept as a top-level choice made at course-launch time so the editor
    // never asks a course creator two competing "how much" questions.
    feeType: { type: String, enum: ['one-time', 'monthly'], default: 'one-time' },
    price: { type: Number, required: true },
    strikePrice: { type: Number },
    monthlyFee: { type: Number, default: null },
    currency: { type: String, default: 'INR' },
    durationWeeks: { type: Number, required: true },
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Intermediate' },
    highlights: { type: [String], default: [] },
    examLogoKey: { type: String }, // key into a frontend icon map, keeps API decoupled from asset paths
    imageUrl: { type: String, default: null },
    isFeatured: { type: Boolean, default: false },
    status: { type: String, enum: ['open', 'launching-soon', 'closed'], default: 'open' },
    // Independent of `status` (which describes enrollment availability for a
    // listed course) — 'private' removes it from every public listing
    // entirely, for a course still being set up or one whose students are
    // all added directly by admin rather than through public checkout.
    visibility: { type: String, enum: ['public', 'private'], default: 'public' },
  },
  { timestamps: true }
);

export default mongoose.models.Course || mongoose.model('Course', courseSchema);
