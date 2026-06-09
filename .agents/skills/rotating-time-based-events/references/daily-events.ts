import { Event } from '@/types/event';

/**
 * Produces a rotating list of "upcoming" events.
 *
 * - Deterministic per calendar day (same order all day, fresh order tomorrow).
 * - Reassigns each event's date/time so the soonest one starts at the NEXT
 *   upcoming hour from `now`, and the rest are spread across the next ~14 days
 *   at realistic times of day that match each event's vibe.
 *
 * The source events in `mockData.ts` act as templates — their original `date`
 * and `time` are replaced; everything else (title, location, participants,
 * tags, etc.) is preserved.
 */

// Simple seeded PRNG (mulberry32) — deterministic per seed.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function daySeed(now: Date): number {
  // YYYYMMDD as integer — changes once per local calendar day.
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function formatTime(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const mm = m.toString().padStart(2, '0');
  return `${h}:${mm} ${suffix}`;
}

// Preferred hour-of-day windows per event vibe, so a sunrise run stays in the
// morning and a salsa night stays in the evening when we re-time it.
function preferredHourFor(event: Event, rand: () => number): number {
  const text = `${event.title} ${event.tags.join(' ')}`.toLowerCase();
  if (/sunrise|morning|breakfast|yoga|run/.test(text)) {
    return 6 + Math.floor(rand() * 3); // 6–8 AM
  }
  if (/brunch|lunch|picnic/.test(text)) {
    return 11 + Math.floor(rand() * 3); // 11 AM – 1 PM
  }
  if (/sunset|golden hour|rooftop|bbq|drinks|mixer|river walk/.test(text)) {
    return 18 + Math.floor(rand() * 2); // 6–7 PM
  }
  if (/salsa|night|dj|dance/.test(text)) {
    return 20 + Math.floor(rand() * 3); // 8–10 PM
  }
  // Default: spread across afternoon/evening.
  return 14 + Math.floor(rand() * 6); // 2–7 PM
}

/**
 * Returns events re-dated so the next occurrence is anchored to the upcoming
 * hour after `now`, with the rest spread out across the coming ~14 days.
 */
export function getDailyRotatingEvents(
  templates: Event[],
  now: Date = new Date(),
): Event[] {
  const rand = mulberry32(daySeed(now));
  const shuffled = shuffle(templates, rand);

  // Next full hour from now.
  const firstSlot = new Date(now);
  firstSlot.setMinutes(0, 0, 0);
  firstSlot.setHours(firstSlot.getHours() + 1);

  return shuffled.map((event, i) => {
    let date: Date;
    if (i === 0) {
      // Soonest event = the next upcoming hour, exactly.
      date = new Date(firstSlot);
    } else {
      // Spread the rest over the next 14 days at vibe-appropriate hours.
      const daysAhead = Math.floor(rand() * 14) + 1;
      date = new Date(now);
      date.setDate(date.getDate() + daysAhead);
      date.setHours(preferredHourFor(event, rand), 0, 0, 0);
    }
    return {
      ...event,
      date,
      time: formatTime(date),
    };
  }).sort((a, b) => a.date.getTime() - b.date.getTime());
}
