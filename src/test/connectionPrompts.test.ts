import { describe, expect, it } from 'vitest';
import { conversationPrompts, daysLeftLabel, planEvents, planInvite, reachOutDaysLeft } from '@/lib/connectionPrompts';

describe('conversationPrompts', () => {
  it('follows the interest of the event where they met', () => {
    expect(conversationPrompts({ firstName: 'Sofia', eventTitle: 'Supper Club', category: 'Dining & cooking' })).toEqual({
      hello: ['Hi Sofia, great to meet you at Supper Club.', 'Know any good spots we should try next?'],
      plan: 'Fancy brunch this weekend?',
    });
  });

  it('follows the activity before the category: after a run club, another run', () => {
    expect(conversationPrompts({ firstName: 'Tom', eventTitle: 'Founders Running Club :: Porto', category: 'Sports' })).toEqual({
      hello: ['Hi Tom, great to meet you at Founders Running Club :: Porto.', 'How long have you been running?'],
      plan: 'Up for another run this week?',
    });
  });

  it('invites to an event by name and day', () => {
    expect(planInvite({ title: 'Sunset Hike!', date: new Date(2099, 11, 6) })).toBe("Want to go to Sunset Hike together? It's on Sunday 6 Dec.");
  });

  it('falls back to a general plan for an unknown category', () => {
    expect(conversationPrompts({ firstName: 'Rui', eventTitle: 'Meetup' }).plan).toBe('Fancy grabbing a coffee this week?');
  });
});

describe('planEvents', () => {
  const now = new Date(2026, 10, 27, 12);
  const day = (d: number) => new Date(2026, 10, 27 + d, 10);
  const events = [
    { id: 'met', title: 'Founders Running Club :: Porto', category: 'Sports', date: day(-1) },
    { id: 'padel', title: 'Wednesday Padel', category: 'Sports', date: day(1) },
    { id: 'run', title: 'Can Run Club X TSH', category: 'Sports', date: day(2) },
    { id: 'old-run', title: 'Morning Run', category: 'Sports', date: day(-3) },
    { id: 'brunch', title: 'Sunday Brunch Club', category: 'Dining & cooking', date: day(1) },
  ];

  it('suggests another run first, then another Sports event', () => {
    const met = { eventId: 'met', title: 'Founders Running Club :: Porto', category: 'Sports' };
    expect(planEvents(events, met, now).map(e => e.id)).toEqual(['run', 'padel']);
  });

  it('prefers the next date of the same series', () => {
    const series = [...events, { id: 'next', title: 'Founders Running Club :: Porto', category: 'Sports', date: day(7), seriesId: 'frc' }];
    const met = { eventId: 'met', title: 'Founders Running Club :: Porto', category: 'Sports', seriesId: 'frc' };
    expect(planEvents(series, met, now).map(e => e.id)).toEqual(['next', 'padel']);
  });
});

describe('reach out within the week', () => {
  const now = new Date(2026, 10, 27, 12);
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  it('counts down the week after connecting', () => {
    expect(daysLeftLabel(reachOutDaysLeft(daysAgo(0), now))).toBe('7 days left');
    expect(daysLeftLabel(reachOutDaysLeft(daysAgo(5), now))).toBe('2 days left');
    expect(daysLeftLabel(reachOutDaysLeft(daysAgo(6), now))).toBe('Last day');
    expect(daysLeftLabel(reachOutDaysLeft(daysAgo(7), now))).toBeNull();
  });
});
