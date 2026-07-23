import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Course from '../models/Course.js';
import Testimonial from '../models/Testimonial.js';
import { seedCourses, seedTestimonials } from '../data/seed.js';

/**
 * One-time migration: now that MONGODB_URI is set, public reads come from
 * the database instead of the in-memory seed fallback (see course.service.js).
 * This copies the existing seed content into Mongo so the public site
 * doesn't go blank the moment a real DB is connected. Idempotent — skips
 * a collection that already has documents.
 */
async function main() {
  const connected = await connectDB();
  if (!connected) {
    console.error('[seed:courses] MONGODB_URI is not set or unreachable — aborting.');
    process.exit(1);
  }

  const courseCount = await Course.countDocuments();
  if (courseCount === 0) {
    await Course.insertMany(seedCourses);
    console.log(`[seed:courses] Inserted ${seedCourses.length} courses.`);
  } else {
    console.log(`[seed:courses] Courses collection already has ${courseCount} documents — skipping.`);
  }

  const testimonialCount = await Testimonial.countDocuments();
  if (testimonialCount === 0) {
    await Testimonial.insertMany(seedTestimonials);
    console.log(`[seed:courses] Inserted ${seedTestimonials.length} testimonials.`);
  } else {
    console.log(`[seed:courses] Testimonials collection already has ${testimonialCount} documents — skipping.`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed:courses] Failed:', err);
  process.exit(1);
});
