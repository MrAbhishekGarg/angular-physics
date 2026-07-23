import mongoose from 'mongoose';

/**
 * Captures contact-form / "notify me" / enrollment-interest submissions.
 */
const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    courseSlug: { type: String },
    message: { type: String },
    source: { type: String, default: 'website' },
  },
  { timestamps: true }
);

export default mongoose.models.Lead || mongoose.model('Lead', leadSchema);
