import { api } from './api.js';

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load the payment widget — check your connection.'));
    document.body.appendChild(script);
  });
}

export const paymentService = {
  createOrder: (itemType, itemId) => api.post('/payments/orders', { itemType, itemId }),
  verify: (payload) => api.post('/payments/verify', payload),

  /**
   * Orchestrates a full Razorpay checkout: create order -> load widget ->
   * open checkout -> verify signature on success. Resolves with the paid
   * Purchase record, or rejects (cancelled/failed/verification error).
   */
  async purchase({ itemType, itemId, itemName, studentName, studentEmail }) {
    const order = await api.post('/payments/orders', { itemType, itemId });
    await loadRazorpayScript();

    return new Promise((resolve, reject) => {
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: 'Angular Physics',
        description: itemName,
        prefill: { name: studentName, email: studentEmail },
        handler: async (response) => {
          try {
            const purchase = await api.post('/payments/verify', response);
            resolve(purchase);
          } catch (err) {
            reject(err);
          }
        },
        modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
      });
      rzp.on('payment.failed', () => reject(new Error('Payment failed — please try again.')));
      rzp.open();
    });
  },
};
