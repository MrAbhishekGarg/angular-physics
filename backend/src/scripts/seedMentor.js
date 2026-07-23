import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

const SALT_ROUNDS = 10;

async function main() {
  const connected = await connectDB();
  if (!connected) {
    console.error('[seed:mentor] MONGODB_URI is not set or unreachable — aborting.');
    process.exit(1);
  }

  const existing = await User.findOne({ role: 'mentor' }).lean();
  if (existing) {
    console.log(`[seed:mentor] A mentor account already exists: ${existing.email}`);
    await mongoose.disconnect();
    process.exit(0);
  }

  const email = (process.env.MENTOR_SEED_EMAIL || 'mentor@angularphysics.com').toLowerCase();
  const password = process.env.MENTOR_SEED_PASSWORD || 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  await User.create({
    name: 'Abhishek Kumar Garg',
    email,
    passwordHash,
    role: 'mentor',
  });

  console.log('[seed:mentor] Mentor account created:');
  console.log(`  email:    ${email}`);
  console.log(`  password: ${password}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed:mentor] Failed:', err);
  process.exit(1);
});
