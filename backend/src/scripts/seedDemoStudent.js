import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';

const SALT_ROUNDS = 10;
const EMAIL = 'demo.student@angularphysics.com';
const PASSWORD = 'DemoStudent123!';

async function main() {
  const connected = await connectDB();
  if (!connected) {
    console.error('MONGODB_URI is not set or unreachable — aborting.');
    process.exit(1);
  }

  let user = await User.findOne({ email: EMAIL });
  if (!user) {
    const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);
    user = await User.create({ name: 'Demo Student', email: EMAIL, phone: '9999999999', passwordHash, role: 'student' });
    console.log('Created demo student:', EMAIL);
  } else {
    console.log('Demo student already exists:', EMAIL);
  }

  const courses = await Course.find().select('_id title').lean();
  let enrolledCount = 0;
  for (const course of courses) {
    const existing = await Enrollment.findOne({ studentId: user._id, courseId: course._id });
    if (existing) {
      if (existing.status !== 'active') {
        existing.status = 'active';
        await existing.save();
      }
      continue;
    }
    await Enrollment.create({ studentId: user._id, courseId: course._id, status: 'active' });
    enrolledCount += 1;
  }
  console.log(`Active in ${courses.length} course(s) total (${enrolledCount} newly created).`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
