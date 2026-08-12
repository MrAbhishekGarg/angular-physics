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
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model('User', userSchema);
