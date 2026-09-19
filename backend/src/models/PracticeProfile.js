import mongoose from 'mongoose';

/**
 * Gamification state for the student Practice Room (points/streaks/levels
 * — see practice.service.js). One document per student, updated whenever a
 * practice-kind TestAttempt is submitted. Deliberately kept separate from
 * User/TestAttempt so a bug here can never touch real exam grading.
 */
const practiceProfileSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    xp: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    // IST calendar date ('YYYY-MM-DD') of the last practice session that
    // counted toward the streak — a plain string sidesteps timezone/DST
    // arithmetic entirely; see utils/istDate.js.
    lastPracticeDay: { type: String, default: null },
    totalSessionsCompleted: { type: Number, default: 0 },
    totalQuestionsAttempted: { type: Number, default: 0 },
    totalCorrect: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.PracticeProfile || mongoose.model('PracticeProfile', practiceProfileSchema);
