// Single source of truth for the WhatsApp contact number used across the
// site (course enrollment CTA, etc).
export const WHATSAPP_NUMBER = '917500737222';

export function buildWhatsAppLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
