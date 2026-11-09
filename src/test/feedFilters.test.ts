import { describe, expect, it } from 'vitest';
import { Event } from '@/types/event';
import {
  DEFAULT_FEED_FILTERS,
  activeFilterCount,
  applyFeedFilters,
  hidesCategoryPill,
  scopeName,
} from '@/lib/feedFilters';

const DAY = 24 * 60 * 60 * 1000;
const ev = (id: string, category: string, extra: Partial<Event> = {}): Event =>
  ({
    id,
    title: id,
    description: '',
    date: new Date(Date.now() + 2 * DAY),
    time: '',
    location: 'Porto',
    imageUrl: '',
    source: 'meetup',
    vibe: 'social',
    groupSize: 'medium',
    maxParticipants: 10,
    currentParticipants: 1,
    participants: [],
    category,
    tags: [],
    ...extra,
  }) as Event;

const events = [
  ev('run', 'Sports'),
  ev('yoga', 'Health & wellness', { womenOnly: true, groupSize: 'small' }),
  ev('comedy', 'Arts & theatre', { date: new Date(Date.now() + 20 * DAY) }),
  ev('wine', 'Dining & cooking'),
];
const mine = ['sports', 'health-wellness', 'arts-theatre'];
const ids = (list: Event[]) => list.map(e => e.id);

describe('feed filters', () => {
  it('"All" means every interest on the profile', () => {
    expect(ids(applyFeedFilters(events, DEFAULT_FEED_FILTERS, mine))).toEqual(['run', 'yoga', 'comedy']);
    expect(scopeName(DEFAULT_FEED_FILTERS)).toBe('your interests');
  });

  it('a selected interest narrows to that category, even one not on the profile', () => {
    expect(ids(applyFeedFilters(events, { ...DEFAULT_FEED_FILTERS, interests: ['sports'] }, mine))).toEqual(['run']);
    expect(ids(applyFeedFilters(events, { ...DEFAULT_FEED_FILTERS, interests: ['dining-cooking'] }, mine))).toEqual(['wine']);
  });

  it('applies time, size and inclusivity, and can ignore time', () => {
    const week = { ...DEFAULT_FEED_FILTERS, time: 'week' as const };
    expect(ids(applyFeedFilters(events, week, mine))).toEqual(['run', 'yoga']);
    expect(ids(applyFeedFilters(events, week, mine, { ignoreTime: true }))).toEqual(['run', 'yoga', 'comedy']);
    expect(ids(applyFeedFilters(events, { ...DEFAULT_FEED_FILTERS, size: ['small'] }, mine))).toEqual(['yoga']);
    expect(ids(applyFeedFilters(events, { ...DEFAULT_FEED_FILTERS, womenOnly: true }, mine))).toEqual(['yoga']);
  });

  it('hides the category pill only when exactly one interest is selected', () => {
    expect(hidesCategoryPill(DEFAULT_FEED_FILTERS)).toBe(false);
    expect(hidesCategoryPill({ ...DEFAULT_FEED_FILTERS, interests: ['sports'] })).toBe(true);
    expect(hidesCategoryPill({ ...DEFAULT_FEED_FILTERS, interests: ['sports', 'games'] })).toBe(false);
  });

  it('counts active chips for "Clear filters"', () => {
    expect(activeFilterCount(DEFAULT_FEED_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_FEED_FILTERS, interests: ['sports'], time: 'week' })).toBe(2);
  });
});
