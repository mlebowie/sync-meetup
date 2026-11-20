import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setPendingIntent, getPendingIntent, takePendingIntent } from '@/lib/pendingIntent';

describe('pending intent', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.useRealTimers());

  it('remembers the event and action', () => {
    setPendingIntent({ eventId: 'e1', eventTitle: 'Sunset Run', action: 'tickets' });
    expect(getPendingIntent()).toMatchObject({ eventId: 'e1', action: 'tickets' });
  });

  it('hands it to the matching event once', () => {
    setPendingIntent({ eventId: 'e1', eventTitle: 'Sunset Run', action: 'register' });
    expect(takePendingIntent('e2')).toBeNull();
    expect(takePendingIntent('e1')).toMatchObject({ eventId: 'e1' });
    expect(takePendingIntent('e1')).toBeNull();
  });

  it('expires after an hour', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-20T10:00:00Z'));
    setPendingIntent({ eventId: 'e1', eventTitle: 'Sunset Run', action: 'register' });
    vi.setSystemTime(new Date('2026-11-20T11:01:00Z'));
    expect(getPendingIntent()).toBeNull();
  });
});
