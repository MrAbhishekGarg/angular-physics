/**
 * Formatting helpers for the Course shape returned by the API.
 * Keeping these here means CourseCard, CourseDetail, and the checkout
 * summary all format price/duration identically without copy-pasting logic.
 */

export function formatPrice(amount, currency = 'INR') {
  if (amount == null) return '';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDuration(weeks) {
  if (!weeks) return '';
  return weeks >= 8 ? `${Math.round(weeks / 4)} months` : `${weeks} weeks`;
}

export function discountPercent(price, strikePrice) {
  if (!strikePrice || strikePrice <= price) return null;
  return Math.round(((strikePrice - price) / strikePrice) * 100);
}
