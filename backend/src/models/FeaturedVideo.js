import mongoose from 'mongoose';

/**
 * A mentor-curated "highlight" video shown on the homepage — independent of
 * the auto-pulled "Latest Uploads" section (see youtube.service.js), so it
 * works even without a YouTube API key configured.
 */
const featuredVideoSchema = new mongoose.Schema(
  {
    youtubeVideoId: { type: String, required: true, trim: true },
    title: { type: String, required: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.FeaturedVideo || mongoose.model('FeaturedVideo', featuredVideoSchema);
