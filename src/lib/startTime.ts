/**
 * Formats an event time label as a 24-hour start time ("18:30").
 * Accepts "6:30 PM", "6pm", "18:30", "12:00–15:30", "6–8 PM", "19h30".
 * Labels without a time (e.g. "All day") are returned unchanged.
 */
export function startTime24(raw: string | null | undefined): string {
  if (!raw) return '';
  const text = raw.trim();
  const m = /(\d{1,2})(?:[:.h](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/i.exec(text);
  if (!m) return text;
  let hour = Number(m[1]);
  const minute = m[2] ?? '00';
  // A suffix may belong to the whole range ("6–8 PM"): use the first one found after the start.
  const suffix = (m[3] ?? /(am|pm|a\.m\.|p\.m\.)/i.exec(text.slice(m.index + m[0].length))?.[1] ?? '')
    .toLowerCase()
    .replace(/\./g, '');
  if (suffix === 'pm' && hour < 12) hour += 12;
  if (suffix === 'am' && hour === 12) hour = 0;
  if (hour > 23 || Number(minute) > 59) return text;
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

/** 24-hour "HH:mm" for a Date, in the viewer's time zone. */
export function time24(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
