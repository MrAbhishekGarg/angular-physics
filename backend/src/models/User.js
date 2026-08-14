import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    // 'admin' is never actually stored here today — the sole admin account
    // is env-configured (see utils/adminUser.js) and never gets a DB row.
    // Included in the enum for schema consistency / future-proofing only.
    role: { type: String, enum: ['student', 'mentor', 'admin'], default: 'student' },
    phone: { type: String, required: true, match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number'] },
    // Only meaningful for role: 'mentor'. A denylist, not an allowlist —
    // empty (the default) means full access, so every mentor created
    // before this field existed keeps working exactly as before with no
    // migration. Keys come from constants/mentorSections.js.
    restrictedSections: { type: [String], default: [] },
    // 'all' (default) preserves today's behavior for every mentor with zero
    // migration. 'selected' scopes the mentor to assignedStudentIds only —
    // an explicit mode, not "empty array = all", since that would be
    // ambiguous with "admin explicitly assigned zero students."
    studentAccessMode: { type: String, enum: ['all', 'selected'], default: 'all' },
    assignedStudentIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },
    // Only meaningful for role: 'mentor'. Default true preserves today's
    // behavior — any mentor can reset any student's password.
    canResetPasswords: { type: Boolean, default: true },
    // Fine-grained action gates within a section the mentor can already see —
    // e.g. hiding "Create Test" while leaving "Edit Test" visible. A denylist,
    // same shape/intent as restrictedSections. Keys come from
    // constants/mentorActions.js.
    restrictedActions: { type: [String], default: [] },
    // Same 'all'/'selected' shape as studentAccessMode/assignedStudentIds.
    courseAccessMode: { type: String, enum: ['all', 'selected'], default: 'all' },
    assignedCourseIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'Course', default: [] },
    // Only meaningful for role: 'mentor'. Default true preserves today's
    // behavior — any mentor can create/edit/delete paid tests and premium notes.
    canManagePaidContent: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model('User', userSchema);
