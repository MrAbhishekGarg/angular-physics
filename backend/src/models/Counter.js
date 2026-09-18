import mongoose from 'mongoose';

/**
 * Backs sequential human-readable IDs (Question.seqId, Test.seqId) via an
 * atomic $inc — Mongoose has no built-in auto-increment, and an ObjectId
 * isn't something a mentor can read over the phone or type into a support
 * message. One counter document per named sequence.
 */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export default mongoose.models.Counter || mongoose.model('Counter', counterSchema);
