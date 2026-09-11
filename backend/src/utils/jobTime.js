/**
 * The Aakash schedule writes class times as bare "H:MM" with no AM/PM
 * marker, and manual entries mix in 24-hour values — so "1:10" means 13:10
 * (afternoon), "09:30" means morning, "16:00" is already 24-hour. A
 * coaching day runs roughly 08:00–21:00 and never in the small hours, which
 * is enough to disambiguate: hours 1–7 are PM, 8–12 are as written, 13–23
 * are already 24-hour. For a range whose end lands before its start, the
 * end crossed the AM/PM boundary (e.g. "7:10–8:10" = 19:10–20:10).
 */
export function toMinutes(str) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(str || '').trim());
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min > 59) return null;
  if (h >= 1 && h <= 7) h += 12;
  return h * 60 + min;
}

export function durationMinutes(start, end) {
  const s = toMinutes(start);
  let e = toMinutes(end);
  if (s == null || e == null) return 0;
  if (e <= s) e += 12 * 60;
  const d = e - s;
  return d > 0 && d <= 8 * 60 ? d : 0;
}

// Buckets a class length for the "1 hr classes / 2 hr classes" stat — a
// ±10 minute tolerance since a real period runs a few minutes short or long
// of the nominal hour (and a double period is rarely exactly 120).
export function classifyDuration(minutes) {
  if (minutes >= 50 && minutes <= 70) return '1hr';
  if (minutes >= 110 && minutes <= 130) return '2hr';
  return 'other';
}
