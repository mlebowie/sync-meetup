import { describe, it, expect } from 'vitest';
import { startTime24, time24 } from '@/lib/startTime';

describe('startTime24', () => {
  it.each([
    ['6:30 PM', '18:30'],
    ['6:00 pm', '18:00'],
    ['6pm', '18:00'],
    ['12:00 PM', '12:00'],
    ['12:30 AM', '00:30'],
    ['9:00 AM', '09:00'],
    ['18:30', '18:30'],
    ['12:00–15:30', '12:00'],
    ['12:00 - 15:30', '12:00'],
    ['6–8 PM', '18:00'],
    ['19h30', '19:30'],
    ['Tomorrow 7:00 AM', '07:00'],
  ])('%s → %s', (input, expected) => {
    expect(startTime24(input)).toBe(expected);
  });

  it('leaves labels without a time unchanged', () => {
    expect(startTime24('All day')).toBe('All day');
    expect(startTime24('')).toBe('');
  });

  it('formats a Date as HH:mm', () => {
    expect(time24(new Date(2026, 10, 19, 7, 5))).toBe('07:05');
  });
});
