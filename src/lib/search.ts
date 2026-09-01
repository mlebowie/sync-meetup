import { Event } from '@/types/event';

/** Lowercases and strips accents so "cafe" matches "café". */
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/**
 * Rank a single event against a normalized query.
 * Lower = better match. -1 = no match.
 */
function rank(event: Event, q: string): number {
  const title = normalize(event.title);
  if (title.includes(q)) return 0;

  const tags = normalize([event.category, ...event.tags].join(' '));
  if (tags.includes(q)) return 1;

  const location = normalize(event.location);
  const organizer = normalize(
    [event.organizer?.name, event.organizer?.type].filter(Boolean).join(' '),
  );
  if (location.includes(q) || organizer.includes(q)) return 2;

  const description = normalize(event.description);
  if (description.includes(q)) return 3;

  return -1;
}

/**
 * Case-insensitive, accent-insensitive search across title, description,
 * category, tags, location, and organizer. Results are ranked: title matches
 * first, then tags/category, then location/organizer, then description.
 * An empty query returns the input list unchanged.
 */
export function searchEvents(events: Event[], query: string): Event[] {
  const q = normalize(query);
  if (!q) return events;

  return events
    .map(e => ({ e, score: rank(e, q) }))
    .filter(x => x.score >= 0)
    .sort(
      (a, b) =>
        a.score - b.score || a.e.date.getTime() - b.e.date.getTime(),
    )
    .map(x => x.e);
}