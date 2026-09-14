import Notification from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';

export async function createNotification({ userId, type, title, message }) {
  const created = await Notification.create({ userId, type: type || 'general', title, message });
  return created.toObject();
}

export async function listMine(userId) {
  const items = await Notification.find({ userId }).sort({ createdAt: -1 }).lean();
  const unreadCount = items.filter((n) => !n.read).length;
  return { items, unreadCount };
}

export async function markRead(userId, id) {
  const updated = await Notification.findOneAndUpdate({ _id: id, userId }, { read: true }, { new: true }).lean();
  if (!updated) throw new ApiError(404, 'Notification not found');
  return updated;
}

export async function markAllRead(userId) {
  await Notification.updateMany({ userId, read: false }, { read: true });
  return { updated: true };
}
