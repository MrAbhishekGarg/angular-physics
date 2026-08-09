import mongoose from 'mongoose';

/**
 * Only the most-recent document is ever read — the mentor "sets" the
 * question of the day by creating a new one, rather than editing a
 * singleton, so there's a natural history of what was live and when.
 */
const questionOfDaySchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    setAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.QuestionOfDay || mongoose.model('QuestionOfDay', questionOfDaySchema);
