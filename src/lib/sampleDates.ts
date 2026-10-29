import { Event } from '@/types/event';

/**
 * Sample events get a made-up start time so the feed feels current.
 * Real events always keep their actual date.
 */
export const withSampleDate = (event: Event, startsAt: number): Event =>
  event.live ? event : { ...event, date: new Date(startsAt) };
