import { describe, it, expect } from 'vitest';
import { Event } from '@/types/event';
import { activitySteps, neighbourhoodOf, pickFirstEvent, placesThisMonth } from '@/lib/memberStart';

const NOW = new Date('2026-11-17T12:00:00Z').getTime();
const DAY = 24 * 60 * 60 * 1000;

const ev = (over: Partial<Event>): Event => ({
  id: Math.random().toString(36).slice(2),
  title: 'Event',
  description: '',
  date: new Date(NOW + DAY),
  time: '10:00',
  location: 'Porto',
  imageUrl: '',
  source: 'partner',
  vibe: 'lively',
  groupSize: 'large',
  maxParticipants: 20,
  currentParticipants: 5,
  participants: [],
  category: 'Social',
  tags: [],
  ...over,
});

describe('neighbourhoodOf', () => {
  it('finds the neighbourhood, ignoring accents and case', () => {
    expect(neighbourhoodOf('Rua de Cedofeita 120, Porto')).toBe('Cedofeita');
    expect(neighbourhoodOf('Praça, Campanha, Porto')).toBe('Campanhã');
    expect(neighbourhoodOf('Jardim do Morro, Vila Nova de Gaia')).toBe('Vila Nova de Gaia');
    expect(neighbourhoodOf('Via do Castelo do Queijo, Matosinhos')).toBe('Matosinhos');
  });

  it('returns null when no place is named', () => {
    expect(neighbourhoodOf('Porto, Portugal')).toBeNull();
  });
});

describe('pickFirstEvent', () => {
  const pick = (events: Event[]) => pickFirstEvent(events, [], () => false, NOW)?.id ?? null;

  it('picks general, low-key formats: coffee, meditation, walks', () => {
    expect(pick([ev({ id: 'c', title: 'Coffee for people new to Porto', vibe: 'social' })])).toBe('c');
    expect(pick([ev({ id: 'm', title: 'Guided meditation in the park', vibe: 'chill' })])).toBe('m');
    expect(pick([ev({ id: 'w', title: 'Sunday walk along the Douro', vibe: 'chill' })])).toBe('w');
  });

  it('puts chill events first', () => {
    const social = ev({ id: 'social', title: 'Coffee meetup', vibe: 'social', date: new Date(NOW + DAY) });
    const chill = ev({ id: 'chill', title: 'Morning walk', vibe: 'chill', date: new Date(NOW + 3 * DAY) });
    expect(pick([social, chill])).toBe('chill');
  });

  it('skips the Expat Girls event as it is stored live (partner source, organiser name)', () => {
    const expatGirls = ev({
      id: 'eg',
      title: 'Air Up: Breathwork, Yoga & Aerial Yoga',
      description: 'Start your Saturday with guided breathwork and a mindful yoga flow.',
      source: 'partner',
      vibe: 'chill',
      organizer: { id: 'org-eg', name: 'Expat Girls Porto' } as Event['organizer'],
    });
    const coffeeByEg = ev({
      id: 'eg-coffee',
      title: 'Coffee morning',
      vibe: 'chill',
      source: 'partner',
      organizer: { id: 'org-eg', name: 'Expat Girls Porto' } as Event['organizer'],
    });
    expect(pick([expatGirls, coffeeByEg])).toBeNull();
  });

  it('skips events tied to a specific interest, even when chill', () => {
    expect(pick([ev({ title: 'Slow flow yoga', vibe: 'chill' })])).toBeNull();
    expect(pick([ev({ title: 'Founders coffee & pitch practice', vibe: 'chill' })])).toBeNull();
    expect(pick([ev({ title: 'Walk & run club', vibe: 'chill' })])).toBeNull();
  });

  it('skips lively events and anything without a general format', () => {
    expect(pick([ev({ title: 'Coffee rave', vibe: 'lively' })])).toBeNull();
    expect(pick([ev({ title: 'Board game night', vibe: 'chill' })])).toBeNull();
  });

  it('skips women-only and age-limited events', () => {
    expect(pick([ev({ title: 'Coffee morning', vibe: 'chill', womenOnly: true })])).toBeNull();
    expect(pick([ev({ title: 'Ladies coffee club', vibe: 'chill' })])).toBeNull();
    expect(pick([ev({ title: 'Coffee & chat (25-40 years)', vibe: 'chill' })])).toBeNull();
    expect(pick([ev({ title: 'Meditation 30+', vibe: 'chill' })])).toBeNull();
  });

  it('skips past, full, joined and far-off events', () => {
    const base = { title: 'Coffee meetup', vibe: 'chill' as const };
    const events = [
      ev({ ...base, id: 'past', date: new Date(NOW - DAY) }),
      ev({ ...base, id: 'full', currentParticipants: 20 }),
      ev({ ...base, id: 'joined' }),
      ev({ ...base, id: 'far', date: new Date(NOW + 30 * DAY) }),
      ev({ ...base, id: 'ok' }),
    ];
    expect(pickFirstEvent(events, [], id => id === 'joined', NOW)?.id).toBe('ok');
  });
});

describe('placesThisMonth', () => {
  it('groups this month\'s matching events by neighbourhood, busiest first', () => {
    const events = [
      ev({ location: 'Bonfim, Porto', tags: ['running'] }),
      ev({ location: 'Bonfim, Porto', tags: ['yoga'] }),
      ev({ location: 'Cedofeita, Porto', tags: ['yoga'] }),
      ev({ location: 'Ribeira, Porto', tags: ['tech'] }),
      ev({ location: 'Bonfim, Porto', tags: ['running'], date: new Date(NOW + 40 * DAY) }),
    ];
    const places = placesThisMonth(events, ['sports', 'health-wellness'], NOW);
    expect(places.map(p => p.name)).toEqual(['Bonfim', 'Cedofeita']);
    expect(places[0].count).toBe(2);
    expect(places[0].interestIds).toEqual(['sports', 'health-wellness']);
  });
});

describe('activitySteps', () => {
  it('starts empty and points at the next joined event', () => {
    const next = ev({ title: 'Coffee for newcomers', date: new Date(NOW + DAY) });
    const { steps } = activitySteps([next], 0, NOW);
    expect(steps.map(s => s.done)).toEqual([false, false, false]);
    expect(steps[0].detail).toBe('Next: Coffee for newcomers');
  });

  it('marks progress from events attended and mutual connections', () => {
    const a = ev({ seriesId: 'run', title: 'Sunset run', date: new Date(NOW - 8 * DAY) });
    const b = ev({ seriesId: 'run', title: 'Sunset run', date: new Date(NOW - DAY) });
    const { steps, attended } = activitySteps([a, b], 2, NOW);
    expect(steps.map(s => s.done)).toEqual([true, true, true]);
    expect(attended[0]).toBe(b);
  });
});

describe('Good first event (Curate)', () => {
  it('lets a marked event qualify and puts it ahead of keyword matches', () => {
    const coffee = ev({ id: 'coffee', title: 'Coffee meetup', vibe: 'chill', date: new Date(NOW + DAY) });
    const marked = ev({ id: 'marked', title: 'Board game afternoon', vibe: 'social', goodFirstEvent: true, date: new Date(NOW + 5 * DAY) });
    expect(pickFirstEvent([coffee, marked], [], () => false, NOW)?.id).toBe('marked');
  });

  it('still never suggests a marked event flagged women only', () => {
    const marked = ev({ title: 'Coffee morning', goodFirstEvent: true, womenOnly: true });
    expect(pickFirstEvent([marked], [], () => false, NOW)).toBeNull();
  });
});
