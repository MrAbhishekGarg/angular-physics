import mongoose from 'mongoose';

/**
 * A Razorpay order/payment record, polymorphic over the two purchasable
 * item types (premium notes, paid tests). `status` starts 'created' when
 * the Razorpay order is opened and flips to 'paid' only after signature
 * verification in payment.service.js — never trust the client for this.
 */
const purchaseSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    itemType: { type: String, enum: ['note', 'test'], required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    razorpayOrderId: { type: String, required: true, index: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },
  },
  { timestamps: true }
);

purchaseSchema.index({ studentId: 1, itemType: 1, itemId: 1 });

export default mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema);
