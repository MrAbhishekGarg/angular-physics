import crypto from 'crypto';
import Note from '../models/Note.js';
import Test from '../models/Test.js';
import Purchase from '../models/Purchase.js';
import { razorpay, isRazorpayConfigured } from '../config/razorpay.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const ITEM_MODELS = { note: Note, test: Test };

async function loadPurchasableItem(itemType, itemId) {
  const Model = ITEM_MODELS[itemType];
  if (!Model) throw new ApiError(400, 'Invalid item type');

  const item = await Model.findById(itemId).lean();
  if (!item) throw new ApiError(404, `${itemType} not found`);

  const isPaid = itemType === 'note' ? item.category === 'premium' : item.isPaid;
  if (!isPaid) throw new ApiError(400, 'This item is free — no payment required');

  return item;
}

export async function hasPurchased(studentId, itemType, itemId) {
  const purchase = await Purchase.findOne({ studentId, itemType, itemId, status: 'paid' }).lean();
  return Boolean(purchase);
}

export async function createOrder(studentId, itemType, itemId) {
  if (!isRazorpayConfigured()) {
    throw new ApiError(503, 'Payments are not configured yet — the mentor needs to set RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET.');
  }

  const item = await loadPurchasableItem(itemType, itemId);
  if (await hasPurchased(studentId, itemType, itemId)) {
    throw new ApiError(409, 'You already purchased this item');
  }

  const amount = item.price;
  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency: item.currency || 'INR',
    receipt: `${itemType}_${itemId}_${Date.now()}`,
  });

  const purchase = await Purchase.create({
    studentId,
    itemType,
    itemId,
    amount,
    currency: item.currency || 'INR',
    razorpayOrderId: order.id,
    status: 'created',
  });

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: env.razorpayKeyId,
    purchaseId: purchase._id,
  };
}

export async function verifyPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  if (!isRazorpayConfigured()) {
    throw new ApiError(503, 'Payments are not configured');
  }
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new ApiError(400, 'Missing payment verification fields');
  }

  const expectedSignature = crypto
    .createHmac('sha256', env.razorpayKeySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const purchase = await Purchase.findOne({ razorpayOrderId: razorpay_order_id });
  if (!purchase) throw new ApiError(404, 'Order not found');

  if (expectedSignature !== razorpay_signature) {
    purchase.status = 'failed';
    await purchase.save();
    throw new ApiError(400, 'Payment verification failed');
  }

  purchase.razorpayPaymentId = razorpay_payment_id;
  purchase.razorpaySignature = razorpay_signature;
  purchase.status = 'paid';
  await purchase.save();

  return purchase.toObject();
}
