// Categorical palette for Aakash batch codes — validated (light surface) via
// the dataviz skill's checker in this fixed order: passes the lightness
// band, chroma floor, CVD separation and the normal-vision floor. The batch
// code itself is always shown as text next to the colour, so the sub-3:1
// surface contrast of a couple of hues is covered by that label (secondary
// encoding); colours are used as translucent tints + solid accent stripes
// rather than text backgrounds so they also read on the dark theme.
const PALETTE = ['#2563eb', '#f97316', '#7c3aed', '#65a30d', '#db2777', '#0891b2', '#ca8a04', '#0d9488'];

// djb2 — the fallback when the caller can't supply the full batch list.
function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) h = (h * 33) ^ str.charCodeAt(i);
  return Math.abs(h);
}

/**
 * `order` (the sorted list of every batch code in view) makes the first
 * eight batches land on eight distinct hues — which is what the mentor
 * actually has. Without it, falls back to a stable per-code hash (fine for
 * a lone chip, but can collide when several are shown together).
 */
export function batchColor(code, order) {
  const c = String(code || '');
  if (Array.isArray(order)) {
    const i = order.indexOf(c);
    if (i >= 0) return PALETTE[i % PALETTE.length];
  }
  return PALETTE[hash(c) % PALETTE.length];
}

export function batchOrder(codes) {
  return [...new Set(codes.map(String))].sort();
}
