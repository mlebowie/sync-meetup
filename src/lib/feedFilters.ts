import { Event, GroupSize } from '@/types/event';
import { ONBOARDING_INTERESTS, matchesInterests } from '@/lib/userProfile';

/**
 * The one set of filters for the signed-in home feed. The pinned bar edits it
 * and every section reads it, so a choice made once applies to the whole page.
 */
export interface FeedFilters {
  /** Selected interest ids. Empty means "All": every interest on the user's profile. */
  interests: string[];
  time: 'any' | 'week' | 'month';
  size: GroupSize[];
  womenOnly: boolean;
  lgbtqFriendly: boolean;
  petFriendly: boolean;
}

export const DEFAULT_FEED_FILTERS: FeedFilters = {
  interests: [],
  time: 'any',
  size: [],
  womenOnly: false,
  lgbtqFriendly: false,
  petFriendly: false,
};

const DAY = 24 * 60 * 60 * 1000;
const TIME_WINDOWS: Record<FeedFilters['time'], number> = { any: Infinity, week: 7 * DAY, month: 30 * DAY };

/** How many chips are switched on; "Clear filters" appears from two. */
export const activeFilterCount = (f: FeedFilters) =>
  f.interests.length +
  (f.time !== 'any' ? 1 : 0) +
  f.size.length +
  (f.womenOnly ? 1 : 0) +
  (f.lgbtqFriendly ? 1 : 0) +
  (f.petFriendly ? 1 : 0);

/** The interests a section should match: the selected ones, or all of the user's own. */
export const interestScope = (f: FeedFilters, profileInterests: string[]) =>
  f.interests.length ? f.interests : profileInterests;

export const interestLabel = (id: string) => ONBOARDING_INTERESTS.find(i => i.id === id)?.label ?? id;

/** "Sports", "Sports and Games", or "your interests" when All is on. */
export const scopeName = (f: FeedFilters) =>
  f.interests.length ? f.interests.map(interestLabel).join(' and ') : 'your interests';

/**
 * When exactly one interest is selected, every card on the page shares that
 * category, so cards drop their category pill.
 */
export const hidesCategoryPill = (f: FeedFilters) => f.interests.length === 1;

export const applyFeedFilters = (
  events: Event[],
  f: FeedFilters,
  profileInterests: string[],
  opts: { ignoreTime?: boolean } = {},
): Event[] => {
  const scope = interestScope(f, profileInterests);
  const now = Date.now();
  const window = opts.ignoreTime ? Infinity : TIME_WINDOWS[f.time];
  return events.filter(e => {
    if (!matchesInterests(e, scope)) return false;
    if (window !== Infinity) {
      const diff = e.date.getTime() - now;
      if (diff < 0 || diff > window) return false;
    }
    if (f.size.length && !f.size.includes(e.groupSize)) return false;
    if (f.womenOnly && !e.womenOnly) return false;
    if (f.lgbtqFriendly && !e.lgbtqFriendly) return false;
    if (f.petFriendly && !e.petFriendly) return false;
    return true;
  });
};
