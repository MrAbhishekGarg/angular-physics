import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['student', 'mentor'], default: 'student' },
    phone: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model('User', userSchema);
