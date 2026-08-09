import mongoose from 'mongoose';

/**
 * A blog post. `body` is plain text rendered as paragraphs split on blank
 * lines — matches the rest of the codebase's no-rich-text-editor
 * convention (see Course.description, Note.description).
 */
const articleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    excerpt: { type: String, required: true },
    body: { type: String, required: true },
    coverImageUrl: { type: String, default: null },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Article || mongoose.model('Article', articleSchema);
