import { Event } from '@/types/event';
import { CITY_NEIGHBORHOODS } from '@/lib/onboardingData';
import { ONBOARDING_INTERESTS, matchesInterests } from '@/lib/userProfile';

const DAY = 24 * 60 * 60 * 1000;

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const textOf = (e: Event) => fold([e.title, e.category, ...e.tags, e.description].join(' '));

/** Coffee meetups and coworking: the easiest rooms to walk into alone. */
const EASY_FORMAT = /\b(coffee|cafe|cowork\w*|co-work\w*|work together|laptop)\b/;

/** Events for one group only (women, men, students, LGBTQ+ only) or with an age limit. */
const RESTRICTED =
  /\b(women only|women-only|ladies|for women|for girls|girls only|men only|for men|students only|members only|adults only)\b|\b\d{2}\s*\+|\bages?\s*\d{2}|\b\d{2}\s*(?:-|–|to)\s*\d{2}\s*(?:years|yrs|y\.?o)|\b(over|under)\s*\d{2}\b/;

/** Open to everyone: no women-only flag, not a women's community, no age or group limit in the listing. */
export const isOpenToAll = (e: Event) =>
  !e.womenOnly && e.source !== 'expat-girls-porto' && !RESTRICTED.test(textOf(e));

/** A good first event: a coffee meetup, coworking or anything labelled chill, open to everyone. */
export const isFirstEventFriendly = (e: Event) =>
  isOpenToAll(e) && (e.vibe === 'chill' || EASY_FORMAT.test(textOf(e)));

/**
 * The easiest event to start with, in the next two weeks, not already joined and
 * with room left. Only coffee meetups, coworking or chill events open to everyone
 * qualify. Coffee and coworking first, then the member's interests, small groups,
 * then the soonest. Returns null rather than suggest anything else.
 */
export const pickFirstEvent = (
  events: Event[],
  interests: string[],
  isAttending: (id: string) => boolean,
  now = Date.now(),
): Event | null => {
  const pool = events.filter(
    e =>
      e.date.getTime() >= now &&
      e.date.getTime() <= now + 14 * DAY &&
      !isAttending(e.id) &&
      (e.maxParticipants <= 0 || e.currentParticipants < e.maxParticipants) &&
      isFirstEventFriendly(e),
  );
  if (!pool.length) return null;

  const score = (e: Event) =>
    (EASY_FORMAT.test(textOf(e)) ? 10 : 0) +
    (e.vibe === 'chill' ? 2 : 0) +
    (interests.length && matchesInterests(e, interests) ? 2 : 0) +
    (e.groupSize === 'small' ? 2 : e.groupSize === 'medium' ? 1 : 0) +
    (e.recurrence && e.recurrence !== 'one-off' ? 1 : 0);

  return [...pool].sort((a, b) => score(b) - score(a) || a.date.getTime() - b.date.getTime())[0];
};

/** Shown as the "Good for newcomers" tag. */
export const isNewcomerFriendly = isFirstEventFriendly;

// Neighbourhoods first (most specific), then the wider towns.
const PLACES: { name: string; key: string }[] = [
  ...Object.values(CITY_NEIGHBORHOODS)
    .flat()
    .map(n => n.replace(/\s*\(.*\)\s*/, '').trim()),
  'Vila Nova de Gaia',
  'Gaia',
  'Matosinhos',
]
  .filter((n, i, all) => all.indexOf(n) === i)
  .map(name => ({ name: name === 'Gaia' ? 'Vila Nova de Gaia' : name, key: fold(name) }))
  .sort((a, b) => b.key.length - a.key.length);

/** The neighbourhood named in an event's location, if any. */
export const neighbourhoodOf = (location: string): string | null => {
  const loc = fold(location);
  const hit = PLACES.find(p => new RegExp(`(^|[^a-z])${p.key}([^a-z]|$)`).test(loc));
  return hit ? hit.name : null;
};

export interface PlaceSummary {
  name: string;
  count: number;
  /** Interest ids (from the member's own list) that happen here. */
  interestIds: string[];
  /** Event categories here, used when the member has no interests yet. */
  categories: string[];
}

/** Where this month's events for the member's interests take place, busiest first. */
export const placesThisMonth = (events: Event[], interests: string[], now = Date.now(), limit = 4): PlaceSummary[] => {
  const end = new Date(now);
  end.setMonth(end.getMonth() + 1, 1);
  end.setHours(0, 0, 0, 0);

  const byPlace = new Map<string, PlaceSummary>();
  for (const e of events) {
    const t = e.date.getTime();
    if (t < now || t >= end.getTime()) continue;
    if (!matchesInterests(e, interests)) continue;
    const name = neighbourhoodOf(e.location);
    if (!name) continue;
    const entry = byPlace.get(name) ?? { name, count: 0, interestIds: [], categories: [] };
    entry.count += 1;
    for (const id of interests) {
      if (!entry.interestIds.includes(id) && matchesInterests(e, [id])) entry.interestIds.push(id);
    }
    if (e.category && !entry.categories.includes(e.category)) entry.categories.push(e.category);
    byPlace.set(name, entry);
  }
  return [...byPlace.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, limit);
};

export const interestLabel = (id: string) => ONBOARDING_INTERESTS.find(i => i.id === id)?.label ?? id;

export interface ActivityStep {
  label: string;
  done: boolean;
  detail?: string;
}

/**
 * The three milestones from new in town to a crew, worked out from the events
 * the member joined on SYNC and the people they've connected with.
 */
export const activitySteps = (
  joined: Event[],
  mutualConnections: number,
  now = Date.now(),
): { steps: ActivityStep[]; attended: Event[]; next: Event | null } => {
  const attended = joined.filter(e => e.date.getTime() < now).sort((a, b) => b.date.getTime() - a.date.getTime());
  const next = joined.filter(e => e.date.getTime() >= now).sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null;

  const seen = new Map<string, number>();
  for (const e of attended) {
    const key = e.seriesId ?? fold(e.title);
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const repeated = [...seen.values()].some(n => n >= 2);

  const steps: ActivityStep[] = [
    {
      label: 'Go to your first event',
      done: attended.length > 0,
      detail: attended.length
        ? `You went to ${attended[attended.length - 1].title}`
        : next
          ? `Next: ${next.title}`
          : undefined,
    },
    {
      label: 'See the same people a second time',
      done: repeated || mutualConnections > 0,
      detail: repeated ? 'You went back to the same group' : undefined,
    },
    {
      label: 'Start a crew for a regular meetup',
      done: mutualConnections >= 2,
      detail: mutualConnections >= 2 ? `${mutualConnections} people want to meet you again` : undefined,
    },
  ];
  return { steps, attended, next };
};
