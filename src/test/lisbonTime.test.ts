import { describe, expect, it } from 'vitest';
import { lisbonToIso } from '@/lib/lisbonTime';

describe('lisbonToIso', () => {
  it('uses winter time (UTC+0) in November', () => {
    expect(lisbonToIso('2026-11-14', '17:00')).toBe('2026-11-14T17:00:00.000Z');
  });
  it('uses summer time (UTC+1) in July', () => {
    expect(lisbonToIso('2026-07-10', '19:30')).toBe('2026-07-10T18:30:00.000Z');
  });
});

import { isoToLisbon, timeLabelFor } from '@/lib/lisbonTime';

describe('isoToLisbon', () => {
  it('round-trips winter and summer times', () => {
    expect(isoToLisbon(lisbonToIso('2026-11-14', '17:00'))).toEqual({ date: '2026-11-14', time: '17:00' });
    expect(isoToLisbon(lisbonToIso('2026-07-10', '19:30'))).toEqual({ date: '2026-07-10', time: '19:30' });
  });
  it('labels start and end', () => {
    expect(timeLabelFor('19:00', '21:00')).toBe('19:00–21:00');
    expect(timeLabelFor('19:00')).toBe('19:00');
  });
});
