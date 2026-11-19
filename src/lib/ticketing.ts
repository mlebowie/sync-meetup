import { Event } from '@/types/event';

/** Where tickets are bought: the organiser's registration link, else the listing. */
export const ticketUrl = (event: Pick<Event, 'registerUrl' | 'sourceUrl'>) =>
  event.registerUrl || event.sourceUrl || undefined;

/** "Eventbrite", "Meetup", "Lu.ma" or the site's host name. */
export function siteName(url: string | undefined): string {
  if (!url) return 'the organiser\'s site';
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (host.includes('meetup')) return 'Meetup';
    if (host.includes('eventbrite')) return 'Eventbrite';
    if (host.includes('lu.ma') || host.includes('luma')) return 'Lu.ma';
    if (host.includes('fever')) return 'Fever';
    return host;
  } catch {
    return 'the organiser\'s site';
  }
}

// Events whose ticket site the person opened from SYNC, so the card can ask
// "Got your ticket?" when they come back. Kept per browser.
const KEY = 'sync.ticketPending.v1';

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* storage unavailable */
  }
}

export const isTicketPending = (eventId: string) => read().includes(eventId);
export const setTicketPending = (eventId: string, pending: boolean) => {
  const ids = read().filter((id) => id !== eventId);
  write(pending ? [...ids, eventId] : ids);
};
