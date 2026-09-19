import mongoose from 'mongoose';
import { TRACKS } from '../constants/tracks.js';

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
    // Only meaningful for role: 'student' — admin-managed, per-student
    // content access, separate from restrictedSections above (which gates
    // a MENTOR's own dashboard, not a student's). A denylist of module
    // keys ('tests' | 'worksheets' | 'notes'); empty (default) means full
    // access, so every existing student keeps working with zero migration.
    restrictedStudentAccess: { type: [String], default: [] },
    // Applies to both 'mentor' and 'student' accounts — an admin-only soft
    // disable, distinct from deletion: an 'inactive' account's data (fee
    // history, test attempts, notes) stays intact and reversible, but login
    // is refused (checked both at login and on every authenticated request,
    // so deactivating someone already logged in takes effect immediately
    // rather than waiting for their session to expire).
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    // Only meaningful for role: 'student' — which exam the student is
    // preparing for, collected at signup and used to personalize the
    // student home/practice experience. null means not asked yet (every
    // student who registered before this field existed), which the
    // frontend prompts for once via a one-time modal.
    track: { type: String, enum: TRACKS, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model('User', userSchema);
