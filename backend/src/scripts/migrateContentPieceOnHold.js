/**
 * One-off migration: "on-hold" used to be a PIECE_STATUSES value, which
 * meant moving a piece to the On Hold column overwrote its real pipeline
 * stage with no way to tell what it actually was. It's now a separate
 * `onHold` boolean (see ContentConcept.js) alongside a real `status` that
 * always reflects the actual stage.
 *
 * There's no way to recover what stage a piece was really at before this
 * migration — the whole problem being fixed is that it was overwritten —
 * so every currently-on-hold piece falls back to status: 'planned' and
 * onHold: true. A mentor can correct the real stage by hand afterward if
 * 'planned' is wrong for a particular piece. Safe to re-run — only touches
 * documents that still have the legacy "on-hold" status value.
 */
import mongoose from 'mongoose';
import { env } from '../config/env.js';

async function run() {
  await mongoose.connect(env.mongoUri);
  const collection = mongoose.connection.db.collection('contentconcepts');

  const affected = await collection.countDocuments({ 'pieces.status': 'on-hold' });
  console.log(`Found ${affected} concept(s) with at least one piece still marked status: 'on-hold'.`);

  const result = await collection.updateMany(
    { 'pieces.status': 'on-hold' },
    { $set: { 'pieces.$[p].status': 'planned', 'pieces.$[p].onHold': true } },
    { arrayFilters: [{ 'p.status': 'on-hold' }] }
  );
  console.log(`Updated ${result.modifiedCount} concept document(s).`);

  // Every other piece (never on hold) still needs onHold explicitly set to
  // false so the new field exists everywhere, not just on the migrated ones.
  const backfill = await collection.updateMany(
    { 'pieces.onHold': { $exists: false } },
    { $set: { 'pieces.$[q].onHold': false } },
    { arrayFilters: [{ 'q.onHold': { $exists: false } }] }
  );
  console.log(`Backfilled onHold: false on ${backfill.modifiedCount} concept document(s).`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
