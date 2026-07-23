import mongoose from 'mongoose';

/**
 * Links a student to a course. Created as 'pending' when a student clicks
 * "Enroll Now" — the mentor approves/rejects from their dashboard since
 * there's no payment gateway to trigger enrollment automatically.
 */
const enrollmentSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    status: { type: String, enum: ['pending', 'active', 'completed', 'cancelled'], default: 'pending' },
    progressPercent: { type: Number, min: 0, max: 100, default: 0 },
  },
  { timestamps: true }
);

enrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

export default mongoose.models.Enrollment || mongoose.model('Enrollment', enrollmentSchema);
