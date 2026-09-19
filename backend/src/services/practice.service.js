import mongoose from 'mongoose';
import PracticeProfile from '../models/PracticeProfile.js';
import Test from '../models/Test.js';
import TestAttempt from '../models/TestAttempt.js';
import User from '../models/User.js';
import { istDateString } from '../utils/istDate.js';
import { PRACTICE_CATEGORIES } from '../constants/practiceCategories.js';

const XP_PER_CORRECT = 10;
const XP_PER_ATTEMPTED_WRONG = 2;
const XP_SESSION_COMPLETE_BONUS = 20;
const XP_PER_LEVEL = 100;

export function listPracticeCategories() {
  return PRACTICE_CATEGORIES;
}

export function getLevelInfo(xp) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = xp % XP_PER_LEVEL;
  return { level, xpIntoLevel, xpForNextLevel: XP_PER_LEVEL };
}

/**
 * Called from test.service.js#submitAttempt for kind:'practice' attempts
 * only — deliberately isolated (its own model, wrapped in try/catch at the
 * call site) so a bug here can never affect real exam submission, which is
 * the one path in this app that must never break.
 */
export async function recordPracticeSession(studentId, { correctCount, wrongCount, questionCount }) {
  const xpEarned = correctCount * XP_PER_CORRECT + wrongCount * XP_PER_ATTEMPTED_WRONG + XP_SESSION_COMPLETE_BONUS;
  const today = istDateString();

  let profile = await PracticeProfile.findOne({ studentId });
  if (!profile) profile = new PracticeProfile({ studentId });

  if (profile.lastPracticeDay !== today) {
    const yesterday = istDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));
    profile.currentStreak = profile.lastPracticeDay === yesterday ? profile.currentStreak + 1 : 1;
    profile.longestStreak = Math.max(profile.longestStreak, profile.currentStreak);
    profile.lastPracticeDay = today;
  }

  profile.xp += xpEarned;
  profile.totalSessionsCompleted += 1;
  profile.totalQuestionsAttempted += questionCount;
  profile.totalCorrect += correctCount;
  await profile.save();

  return { xpEarned, levelInfo: getLevelInfo(profile.xp) };
}

export async function getMyPracticeProfile(studentId) {
  const profile = await PracticeProfile.findOne({ studentId }).lean();
  if (!profile) {
    return {
      xp: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalSessionsCompleted: 0,
      totalQuestionsAttempted: 0,
      totalCorrect: 0,
      levelInfo: getLevelInfo(0),
    };
  }
  return { ...profile, levelInfo: getLevelInfo(profile.xp) };
}

/**
 * Admin/mentor view of the whole student body's practice activity — item
 * "Practice Section stats of students must be shared with admin with full
 * control." Joins PracticeProfile with User for name/email, and separately
 * pulls each student's practice TestAttempt history for a chapter/topic
 * breakdown (kind:'practice' Tests are one-off and per-student, so this is
 * the only place that history lives).
 */
export async function getPracticeStatsForAdmin() {
  const [profiles, students] = await Promise.all([
    PracticeProfile.find().lean(),
    User.find({ role: 'student' }).select('name email track').lean(),
  ]);
  const studentById = new Map(students.map((s) => [s._id.toString(), s]));

  const rows = profiles
    .map((p) => {
      const student = studentById.get(p.studentId.toString());
      if (!student) return null;
      return {
        studentId: p.studentId.toString(),
        name: student.name,
        email: student.email,
        track: student.track || null,
        xp: p.xp,
        levelInfo: getLevelInfo(p.xp),
        currentStreak: p.currentStreak,
        longestStreak: p.longestStreak,
        totalSessionsCompleted: p.totalSessionsCompleted,
        totalQuestionsAttempted: p.totalQuestionsAttempted,
        totalCorrect: p.totalCorrect,
        accuracyPercent:
          p.totalQuestionsAttempted > 0 ? Math.round((p.totalCorrect / p.totalQuestionsAttempted) * 1000) / 10 : 0,
        lastPracticeDay: p.lastPracticeDay,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.xp - a.xp);

  const totalPracticeAttempts = await TestAttempt.countDocuments({
    status: 'submitted',
    testId: { $in: await Test.find({ kind: 'practice' }).distinct('_id') },
  });

  return {
    students: rows,
    summary: {
      activeStudents: rows.length,
      totalSessionsCompleted: rows.reduce((n, r) => n + r.totalSessionsCompleted, 0),
      totalQuestionsAttempted: rows.reduce((n, r) => n + r.totalQuestionsAttempted, 0),
      totalPracticeAttempts,
    },
  };
}

/** Admin-only reset — full control per the request, e.g. to correct abuse or a data-entry mistake. */
export async function resetPracticeProfile(studentId) {
  await PracticeProfile.findOneAndUpdate(
    { studentId: new mongoose.Types.ObjectId(studentId) },
    { xp: 0, currentStreak: 0, longestStreak: 0, lastPracticeDay: null, totalSessionsCompleted: 0, totalQuestionsAttempted: 0, totalCorrect: 0 },
    { upsert: true }
  );
  return { reset: true };
}
