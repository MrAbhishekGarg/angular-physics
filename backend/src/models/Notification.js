import mongoose from 'mongoose';

/**
 * A minimal in-portal notification — no email/SMS in this app, so this is
 * the entire delivery mechanism. `type` is informational only (lets the UI
 * pick an icon/tone later); nothing in the backend branches on it besides
 * course-fees' 'fee-reminder' sender tagging its own messages.
 */
const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, default: 'general' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
