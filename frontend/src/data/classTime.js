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

// Mirrors backend/src/utils/jobTime.js's classInterval/isClassEnded exactly
// (same IST-offset math, same missing-endTime fallback) so a class's live
// upcoming/ongoing/ended status agrees with the server's own "done" boundary
// regardless of the viewer's own device timezone — these classes only ever
// happen in India, never wherever the mentor's browser clock is set to.
const IST_OFFSET_MINUTES = 5 * 60 + 30;

export function classInterval(dateStr, startTime, endTime) {
  const s = parse(startTime);
  if (!s) return null;
  const startMin = s.h * 60 + s.min;
  let endMin;
  const e = parse(endTime);
  if (!e) endMin = startMin + 60;
  else {
    endMin = e.h * 60 + e.min;
    if (endMin <= startMin) endMin += 12 * 60;
  }
  const day = new Date(dateStr);
  const base = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0, 0);
  return {
    start: new Date(base + (startMin - IST_OFFSET_MINUTES) * 60000),
    end: new Date(base + (endMin - IST_OFFSET_MINUTES) * 60000),
  };
}

// 'not-started' | 'ongoing' | 'ended', plus the resolved start/end instants
// so callers (a countdown, say) don't have to recompute the interval.
export function classLiveStatus(dateStr, startTime, endTime, now = new Date()) {
  const interval = classInterval(dateStr, startTime, endTime);
  if (!interval) return null;
  const phase = now < interval.start ? 'not-started' : now < interval.end ? 'ongoing' : 'ended';
  return { phase, ...interval };
}

// "2h 15m" / "45m" style — for a countdown to a class's start (or, given a
// negative ms already guarded by the caller, could format any duration).
export function formatCountdown(ms) {
  if (ms == null || ms <= 0) return null;
  const totalMin = Math.round(ms / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
