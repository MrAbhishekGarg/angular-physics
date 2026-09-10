// Aakash writes class times as bare "H:MM" with no AM/PM, mixed with the
// odd 24-hour manual entry. A coaching day runs ~08:00–21:00 and never at
// night, so: hours 1–7 are PM, 8–12 are as written (8–11 = AM, 12 = noon),
// 13–23 are already 24-hour. An end that lands before its start crossed
// the noon/evening line (e.g. "7:10–8:10" = 7:10 PM – 8:10 PM).

function parse(str) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(str || '').trim());
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min > 59) return null;
  if (h >= 1 && h <= 7) h += 12;
  return { h, min };
}

function label({ h, min }) {
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(min).padStart(2, '0')} ${ampm}`;
}

export function formatTime(str) {
  const p = parse(str);
  return p ? label(p) : str || '';
}

export function formatTimeRange(start, end) {
  const s = parse(start);
  if (!s) return [start, end].filter(Boolean).join(' – ');
  let e = parse(end);
  if (e && (e.h * 60 + e.min) <= s.h * 60 + s.min) e = { h: e.h + 12, min: e.min };
  return e ? `${label(s)} – ${label(e)}` : label(s);
}
