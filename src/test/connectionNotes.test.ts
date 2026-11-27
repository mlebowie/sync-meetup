import { describe, expect, it } from 'vitest';
import { getConnectionNote, lastMetAt, setConnectionNote } from '@/lib/connectionNotes';

describe('connection notes', () => {
  it('keeps one note per person, up to 140 characters', () => {
    setConnectionNote('7', 'salsa, from Berlin');
    expect(getConnectionNote('7')).toBe('salsa, from Berlin');
    setConnectionNote('7', 'x'.repeat(200));
    expect(getConnectionNote('7')).toHaveLength(140);
  });
});

describe('lastMetAt', () => {
  const day = (d: number) => new Date(2026, 10, d);
  it('picks the most recent event you were both at, from tags or past events', () => {
    const tags = [{ participantId: '7', eventId: 'a', eventTitle: 'Sunday Brunch Club', taggedAt: day(20) }];
    const history = [{ eventId: 'b', title: 'Salsa Night', date: day(25), category: 'Dance', coAttendeeIds: ['7', '9'] }];
    expect(lastMetAt('7', tags, history)?.title).toBe('Salsa Night');
    expect(lastMetAt('9', tags, history)?.title).toBe('Salsa Night');
    expect(lastMetAt('1', tags, history)).toBeNull();
  });
});
