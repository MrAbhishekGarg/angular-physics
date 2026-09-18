import Counter from '../models/Counter.js';

/** Atomically returns the next number in a named sequence, creating it at 0 -> 1 if it doesn't exist yet. */
export async function getNextSequence(name) {
  const counter = await Counter.findByIdAndUpdate(name, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return counter.seq;
}

/** Advances a sequence to at least `value` — used by one-time backfills so future getNextSequence calls continue past whatever was just assigned. */
export async function bumpSequenceTo(name, value) {
  await Counter.findByIdAndUpdate(name, { $max: { seq: value } }, { upsert: true });
}
