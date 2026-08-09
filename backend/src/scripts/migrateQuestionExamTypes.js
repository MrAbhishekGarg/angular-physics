/**
 * One-off migration: Question.examType (single required String) ->
 * Question.examTypes (array, optional). Reads the raw collection (bypassing
 * the current Mongoose schema, which no longer declares `examType`) so the
 * old value is still visible on-disk even after the schema change ships.
 * Safe to re-run — only touches documents that still have a legacy
 * `examType` field and no `examTypes` yet.
 */
import mongoose from 'mongoose';
import { env } from '../config/env.js';

async function run() {
  await mongoose.connect(env.mongoUri);
  const collection = mongoose.connection.db.collection('questions');

  const legacy = await collection.find({ examType: { $exists: true } }).toArray();
  console.log(`Found ${legacy.length} question(s) with a legacy examType field.`);

  let migrated = 0;
  for (const doc of legacy) {
    await collection.updateOne(
      { _id: doc._id },
      { $set: { examTypes: doc.examType ? [doc.examType] : [] }, $unset: { examType: '' } }
    );
    migrated += 1;
  }
  console.log(`Migrated ${migrated} question(s).`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
