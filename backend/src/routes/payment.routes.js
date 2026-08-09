import { Router } from 'express';
import { createOrder, verifyPayment } from '../controllers/payment.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.post(
  '/orders',
  authenticate,
  authorize('student'),
  validateBody(['itemType', 'itemId']),
  createOrder
);
router.post(
  '/verify',
  authenticate,
  authorize('student'),
  validateBody(['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature']),
  verifyPayment
);

export default router;
