import mongoose from 'mongoose';

/**
 * A lecture video attached to a course — either an uploaded file (streamed
 * through an auth-gated route, never served statically) or a YouTube video
 * id (embedded via iframe; the source video must be Unlisted, not Private,
 * for YouTube to allow embedding for viewers who aren't the channel owner).
 */
const videoSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    order: { type: Number, default: 0 },
    source: { type: String, enum: ['upload', 'youtube'], required: true },
    fileKey: { type: String },
    fileName: { type: String },
    fileType: { type: String },
    fileSizeBytes: { type: Number },
    youtubeVideoId: { type: String },
    durationSeconds: { type: Number },
    status: { type: String, enum: ['draft', 'published'], default: 'published' },
  },
  { timestamps: true }
);

export default mongoose.models.Video || mongoose.model('Video', videoSchema);
