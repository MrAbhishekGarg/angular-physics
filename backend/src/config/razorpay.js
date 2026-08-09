import Razorpay from 'razorpay';
import { env } from './env.js';

/**
 * Null until real keys are configured — matches the graceful-degradation
 * pattern used by db.js, rather than crashing the whole server on boot.
 */
export const razorpay =
  env.razorpayKeyId && env.razorpayKeySecret
    ? new Razorpay({ key_id: env.razorpayKeyId, key_secret: env.razorpayKeySecret })
    : null;

export function isRazorpayConfigured() {
  return razorpay !== null;
}
