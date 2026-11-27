import { describe, expect, it } from 'vitest';
import { conversationPrompts, daysLeftLabel, reachOutDaysLeft } from '@/lib/connectionPrompts';

describe('conversationPrompts', () => {
  it('follows the interest of the event where they met', () => {
    expect(conversationPrompts({ firstName: 'Sofia', eventTitle: 'Sunday Brunch Club', category: 'Dining & cooking' })).toEqual({
      hello: ['Hi Sofia, great to meet you at Sunday Brunch Club.', 'Know any good spots we should try next?'],
      plan: 'Fancy brunch this weekend?',
    });
  });

  it('suggests the next event in the same category when there is one', () => {
    const prompts = conversationPrompts({
      firstName: 'Tom',
      eventTitle: 'Saturday Trail Run',
      category: 'Outdoors activities',
      nextEvent: { title: 'Sunset Hike!', date: new Date(2099, 11, 6) },
    });
    expect(prompts.plan).toBe("Want to go to Sunset Hike together? It's on Sunday 6 Dec.");
  });

  it('falls back to a general plan for an unknown category', () => {
    expect(conversationPrompts({ firstName: 'Rui', eventTitle: 'Meetup' }).plan).toBe('Fancy grabbing a coffee this week?');
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
