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
    // 'security' means this payment was covered from the deposit rather
    // than a fresh collection — see securityApplied below.
    paidVia: { type: String, enum: ['cash', 'security'], default: 'cash' },
  },
  { timestamps: true }
);

const monthlyPaymentSchema = new mongoose.Schema(
  {
    month: { type: String, required: true }, // "YYYY-MM"
    amount: { type: Number, required: true },
    // Admin-entered by hand, same as paidDate — when this month's fee is
    // supposed to be paid by. Fees are paid in advance, so this is
    // typically before the month itself starts.
    dueDate: { type: Date, default: null },
    paid: { type: Boolean, default: false },
    paidDate: { type: Date, default: null },
    paidVia: { type: String, enum: ['cash', 'security'], default: 'cash' },
    // Student self-reported "I paid this" — a non-blocking flag the mentor
    // reviews and confirms via the existing paid/paidDate fields; it never
    // gates anything on its own.
    claimedByStudent: { type: Boolean, default: false },
    claimedAt: { type: Date, default: null },
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
    // Required in practice for monthly payers (enforced in the service, not
    // the schema, since a one-time payer has no use for it) — anchors due
    // dates and reminders to when the student actually started.
    registrationDate: { type: Date, default: null },
    totalFee: { type: Number, default: 0 },
    payments: { type: [paymentSchema], default: [] },
    monthlyFee: { type: Number, default: 0 },
    monthlyPayments: { type: [monthlyPaymentSchema], default: [] },
    securityAmount: { type: Number, default: 0 },
    securityPaid: { type: Number, default: 0 },
    // How much of securityPaid has already been used to cover a month/
    // payment (paidVia: 'security') — never exceeds securityPaid; the
    // remainder is what's still actually available as a refundable deposit.
    securityApplied: { type: Number, default: 0 },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.CourseFeeStudent || mongoose.model('CourseFeeStudent', courseFeeStudentSchema);
