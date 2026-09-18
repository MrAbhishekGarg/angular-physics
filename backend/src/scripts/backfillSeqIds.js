/**
 * One-time backfill: assigns seqId to every existing Question and
 * mentor-authored Test (kind:'test') that predates the seqId field, in
 * creation order, so old content gets a real reference id too instead of
 * only content created after this migration. Run once per environment:
 *   node src/scripts/backfillSeqIds.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Question from '../models/Question.js';
import Test from '../models/Test.js';
import { bumpSequenceTo } from '../utils/sequence.js';

dotenv.config();

async function backfillQuestions() {
  const missing = await Question.find({ seqId: null }).sort({ createdAt: 1 }).select('_id').lean();
  console.log(`Questions missing seqId: ${missing.length}`);
  let next = 1;
  for (const { _id } of missing) {
    await Question.updateOne({ _id }, { $set: { seqId: next } });
    next += 1;
  }
  await bumpSequenceTo('question', next - 1);
  console.log(`Assigned Q-1..Q-${next - 1}`);
}

async function backfillTests() {
  const missing = await Test.find({ seqId: null, kind: 'test' }).sort({ createdAt: 1 }).select('_id').lean();
  console.log(`Tests missing seqId: ${missing.length}`);
  let next = 1;
  for (const { _id } of missing) {
    await Test.updateOne({ _id }, { $set: { seqId: next } });
    next += 1;
  }
  await bumpSequenceTo('test', next - 1);
  console.log(`Assigned T-1..T-${next - 1}`);
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/angular-physics');
  await backfillQuestions();
  await backfillTests();
  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
