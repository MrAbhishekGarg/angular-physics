import * as paymentService from '../services/payment.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const createOrder = asyncHandler(async (req, res) => {
  const { itemType, itemId } = req.body;
  const order = await paymentService.createOrder(req.user.id, itemType, itemId);
  return ApiResponse(res, 201, order);
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const purchase = await paymentService.verifyPayment(req.body);
  return ApiResponse(res, 200, purchase);
});
