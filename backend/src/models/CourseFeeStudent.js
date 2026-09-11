import mongoose from 'mongoose';

/**
 * One student's fee record within a CourseFeeBatch. `feeType` is chosen per
 * student (not per batch) — two students in the same live batch can
 * legitimately pay on different terms.
 *
 * One-time payers use `totalFee` + `payments` — a free-form log, since a
 * lump sum might still land in a couple of installments on whatever dates
 * they actually pay.
 *
 * Monthly payers use `monthlyFee` (the expected amount per month) +
 * `monthlyPayments` — an explicit calendar of months, each entered by hand
 * (this app has no recurring-billing automation) and marked paid/pending
 * with the date collected, so "which months are paid vs pending" is a plain
 * list rather than something inferred from an amount total.
 *
 * feePaid/feeDue are always derived (see courseFees.service.js) from
 * whichever log applies, never stored, so they can't drift out of sync.
 *
 * The security deposit is tracked separately from tuition — a refundable
 * amount collected once, not an installment log — as a plain agreed amount
 * vs. how much of it has actually been collected so far.
 *
 * `userId` optionally links to a real platform login account (see
 * auth.service.js) for a student registered with sign-in access, as
 * opposed to a plain name/contact row kept for manual tracking only.
 */
const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

const monthlyPaymentSchema = new mongoose.Schema(
  {
    month: { type: String, required: true }, // "YYYY-MM"
    amount: { type: Number, required: true },
    paid: { type: Boolean, default: false },
    paidDate: { type: Date, default: null },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

const courseFeeStudentSchema = new mongoose.Schema(
  {
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseFeeBatch', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    name: { type: String, required: true, trim: true },
    contact: { type: String, default: '', trim: true },
    feeType: { type: String, enum: ['one-time', 'monthly'], required: true, default: 'one-time' },
    totalFee: { type: Number, default: 0 },
    payments: { type: [paymentSchema], default: [] },
    monthlyFee: { type: Number, default: 0 },
    monthlyPayments: { type: [monthlyPaymentSchema], default: [] },
    securityAmount: { type: Number, default: 0 },
    securityPaid: { type: Number, default: 0 },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.CourseFeeStudent || mongoose.model('CourseFeeStudent', courseFeeStudentSchema);
