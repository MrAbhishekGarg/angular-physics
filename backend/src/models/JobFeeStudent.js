import mongoose from 'mongoose';

/**
 * One student's fee record within a JobFeeBatch. Each student can owe a
 * different total (fees are negotiated individually), and pays across
 * however many installments on however many dates — so payments are a log,
 * not a single amount/date pair. feePaid/feeDue are always derived from
 * `payments` (see jobFees.service.js) rather than stored, so they can never
 * drift out of sync with the log.
 */
const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

const jobFeeStudentSchema = new mongoose.Schema(
  {
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobFeeBatch', required: true, index: true },
    name: { type: String, required: true, trim: true },
    contact: { type: String, default: '', trim: true },
    totalFee: { type: Number, required: true, default: 0 },
    payments: { type: [paymentSchema], default: [] },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.JobFeeStudent || mongoose.model('JobFeeStudent', jobFeeStudentSchema);
