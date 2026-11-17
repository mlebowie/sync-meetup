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
  it('prefers a small, calm event that matches interests', () => {
    const big = ev({ id: 'big', tags: ['yoga'], date: new Date(NOW + DAY) });
    const small = ev({ id: 'small', tags: ['yoga'], groupSize: 'small', vibe: 'chill', date: new Date(NOW + 3 * DAY) });
    const offTopic = ev({ id: 'off', tags: ['tech'], groupSize: 'small', vibe: 'chill' });
    expect(pickFirstEvent([big, small, offTopic], ['health-wellness'], () => false, NOW)?.id).toBe('small');
  });

  it('skips past, full, joined and far-off events', () => {
    const events = [
      ev({ id: 'past', date: new Date(NOW - DAY) }),
      ev({ id: 'full', currentParticipants: 20 }),
      ev({ id: 'joined' }),
      ev({ id: 'far', date: new Date(NOW + 30 * DAY) }),
      ev({ id: 'ok' }),
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
