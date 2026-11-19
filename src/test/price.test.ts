import { describe, it, expect } from 'vitest';
import { priceInfo, isPaid } from '@/lib/price';
import { siteName } from '@/lib/ticketing';

describe('priceInfo', () => {
  it.each([
    ['Free', { kind: 'free', label: 'Free' }],
    ['free entry', { kind: 'free', label: 'Free' }],
    ['Grátis', { kind: 'free', label: 'Free' }],
    ['€40', { kind: 'amount', label: '€40' }],
    ['€15.00', { kind: 'amount', label: '€15' }],
    ['15€', { kind: 'amount', label: '€15' }],
    ['From €27.92', { kind: 'amount', label: 'From €27.92' }],
    ['From €20.00', { kind: 'amount', label: 'From €20' }],
    ['Varies by registration type', { kind: 'varies', label: 'Paid · see site' }],
    ['Check ticket price on event', { kind: 'varies', label: 'Paid · see site' }],
  ])('%s', (input, expected) => {
    expect(priceInfo(input)).toEqual(expected);
  });

  it.each(['', '   ', 'TBD', 'N/A', null, undefined])('shows nothing for %s', (input) => {
    expect(priceInfo(input as string)).toBeNull();
  });

  it('treats amounts and "varies" as paid, free as not', () => {
    expect(isPaid(priceInfo('€10'))).toBe(true);
    expect(isPaid(priceInfo('Varies'))).toBe(true);
    expect(isPaid(priceInfo('Free'))).toBe(false);
    expect(isPaid(priceInfo('TBD'))).toBe(false);
  });
});

describe('siteName', () => {
  it('names common ticket sites', () => {
    expect(siteName('https://www.eventbrite.pt/e/123')).toBe('Eventbrite');
    expect(siteName('https://lu.ma/abc')).toBe('Lu.ma');
    expect(siteName('https://tickets.example.org/x')).toBe('tickets.example.org');
    expect(siteName(undefined)).toBe("the organiser's site");
  });
});
