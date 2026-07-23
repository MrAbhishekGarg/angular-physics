import mongoose from 'mongoose';

const testimonialSchema = new mongoose.Schema(
  {
    studentName: { type: String, required: true },
    result: { type: String, required: true }, // e.g. "AIR 47, JEE Advanced 2026"
    track: { type: String, enum: ['iit-jee', 'neet', 'olympiad'], required: true },
    quote: { type: String, required: true },
    videoUrl: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Testimonial || mongoose.model('Testimonial', testimonialSchema);
