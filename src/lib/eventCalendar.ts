import { Event } from '@/types/event';
import { format } from 'date-fns';

export function parseEventDates(event: Event): { start: Date; end: Date } {
  const start = new Date(event.date);
  const m = event.time?.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (m) {
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const mer = m[3]?.toUpperCase();
    if (mer === 'PM' && h < 12) h += 12;
    if (mer === 'AM' && h === 12) h = 0;
    start.setHours(h, min, 0, 0);
  }
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return { start, end };
}

export function toGCalDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function buildIcs(event: Event, start: Date, end: Date) {
  const fmt = (d: Date) => toGCalDate(d);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sync//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@sync`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
    `LOCATION:${event.location}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function googleCalendarUrl(event: Event) {
  const { start, end } = parseEventDates(event);
  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${toGCalDate(start)}/${toGCalDate(end)}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.location)}`;
}

export function downloadIcs(event: Event) {
  const { start, end } = parseEventDates(event);
  const blob = new Blob([buildIcs(event, start, end)], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.title.replace(/\s+/g, '-')}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export function shareStrings(event: Event) {
  const { start } = parseEventDates(event);
  const url = typeof window !== 'undefined' ? `${window.location.origin}/?event=${event.id}` : '';
  const text = `Join me at ${event.title} on ${format(start, 'EEE, MMM d')} at ${event.time} — ${event.location}`;
  return { url, text };
}
