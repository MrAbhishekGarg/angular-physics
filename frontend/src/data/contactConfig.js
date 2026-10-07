// Single source of truth for the WhatsApp contact number used across the
// site (course enrollment CTA, etc). Replace with the real business number
// (country code + number, no symbols/spaces — e.g. "919876543210").
export const WHATSAPP_NUMBER = '911234567890';

export function buildWhatsAppLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
