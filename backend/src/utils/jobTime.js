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

// This whole module treats every class as India wall-clock time (the
// mentor's classes only ever happen in India), regardless of what timezone
// the server process itself runs in — so "is this class over yet" has to
// convert IST wall-clock minutes into a real UTC instant explicitly rather
// than trusting the server's own local timezone.
const IST_OFFSET_MINUTES = 5 * 60 + 30;

/**
 * The class's real start/end as absolute instants (JS Dates), not just
 * minutes-of-day — needed to compare against "right now" for a live
 * upcoming/ongoing/ended status. `date` is the UTC-midnight-stored calendar
 * day (see startOfDay in jobSchedule.service.js); its Y/M/D read via the
 * UTC getters is the intended Indian calendar date regardless of server TZ.
 * Missing endTime (a manual entry might not have one) assumes a standard
 * one-period ~1hr length rather than leaving the class "ongoing" forever.
 * Returns null only if startTime itself can't be parsed at all.
 */
export function classInterval(date, startTime, endTime) {
  const s = toMinutes(startTime);
  if (s == null) return null;
  let e = toMinutes(endTime);
  if (e == null) e = s + 60;
  else if (e <= s) e += 12 * 60;

  const day = new Date(date);
  const base = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0, 0);
  return {
    start: new Date(base + (s - IST_OFFSET_MINUTES) * 60000),
    end: new Date(base + (e - IST_OFFSET_MINUTES) * 60000),
  };
}

/**
 * Whether a class's real end time has passed — the boundary "done" everyone
 * downstream (dashboard counts, batch summaries, the schedule page) uses
 * instead of the coarser "today counts as done at midnight" this replaced.
 * Falls back to whole-day granularity only in the unlikely case startTime
 * itself doesn't parse.
 */
export function isClassEnded(cls, now = new Date()) {
  const interval = classInterval(cls.date, cls.startTime, cls.endTime);
  if (interval) return now.getTime() >= interval.end.getTime();
  const day = new Date(cls.date);
  const nextDay = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + 1, 0, 0, 0, 0) - IST_OFFSET_MINUTES * 60000;
  return now.getTime() >= nextDay;
}
