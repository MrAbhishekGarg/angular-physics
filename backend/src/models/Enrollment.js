import mongoose from 'mongoose';

// One payment against a live course's negotiated one-time fee.
const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    note: { type: String, default: '' },
  },
  { _id: true }
);

// One billing cycle of a live course's negotiated monthly fee.
const monthlyPaymentSchema = new mongoose.Schema(
  {
    month: { type: String, required: true }, // "YYYY-MM"
    amount: { type: Number, required: true },
    dueDate: { type: Date, default: null },
    paid: { type: Boolean, default: false },
    paidDate: { type: Date, default: null },
    note: { type: String, default: '' },
  },
  { _id: true }
);

/**
 * Links a student to a course. Created as 'pending' when a student clicks
 * "Enroll Now" — the mentor approves/rejects from their dashboard since
 * there's no payment gateway to trigger enrollment automatically.
 *
 * The `fee*`/`payments`/`monthlyPayments`/`security*` fields only apply to
 * a live course (Course.courseType === 'live') — a mentor/admin negotiates
 * these per student at registration and tracks them manually here, since a
 * live course has no public price or payment gateway of its own. A
 * recorded course's fee lives entirely on Course.price + a Purchase record
 * instead and never touches these fields.
 */
const enrollmentSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    status: { type: String, enum: ['pending', 'active', 'completed', 'cancelled'], default: 'pending' },
    progressPercent: { type: Number, min: 0, max: 100, default: 0 },
    // When the student actually joined a live course — the anchor date used
    // to generate one monthlyPayments entry per elapsed month (their billing
    // cycle runs from this date, not the calendar month).
    registrationDate: { type: Date, default: null },
    feeType: { type: String, enum: ['one-time', 'monthly'], default: null },
    totalFee: { type: Number, default: 0 },
    payments: { type: [paymentSchema], default: [] },
    monthlyFee: { type: Number, default: 0 },
    monthlyPayments: { type: [monthlyPaymentSchema], default: [] },
    securityAmount: { type: Number, default: 0 },
    securityPaid: { type: Number, default: 0 },
    feeNotes: { type: String, default: '' },
  },
  { timestamps: true }
);

enrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

export default mongoose.models.Enrollment || mongoose.model('Enrollment', enrollmentSchema);
