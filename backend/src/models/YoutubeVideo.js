import mongoose from 'mongoose';

// A cached copy of the channel's uploaded videos, distinct from Video.js
// (which is course-lecture content gated by enrollment) — this is the
// public, YouTube-channel-wide library shown on the /videos page.
const youtubeVideoSchema = new mongoose.Schema(
  {
    videoId: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true },
    thumbnailUrl: { type: String, default: '' },
    publishedAt: { type: Date },
    playlistIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Playlist' }],
  },
  { timestamps: true }
);

export default mongoose.models.YoutubeVideo || mongoose.model('YoutubeVideo', youtubeVideoSchema);
