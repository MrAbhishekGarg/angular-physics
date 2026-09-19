const IST_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** 'YYYY-MM-DD' for the given instant, in India time — regardless of server timezone. */
export function istDateString(date = new Date()) {
  return IST_DATE_FORMATTER.format(date);
}
