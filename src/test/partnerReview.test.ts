import { describe, expect, it } from 'vitest';
import { applyBulk, draftToPatch, missingFields, sameDraft, toDraft, type PartnerRow } from '@/lib/partnerReview';

const row = (over: Partial<PartnerRow> = {}): PartnerRow => ({
  id: 'a',
  title: 'Sunset yoga',
  description: 'Flow by the river',
  starts_at: '2026-12-05T18:00:00.000Z',
  ends_at: '2026-12-05T19:00:00.000Z',
  venue_name: 'Jardim do Morro',
  location: null,
  price_label: '€10',
  category: 'Health & wellness',
  vibe: null,
  group_size: null,
  image_url: 'https://x/y.jpg',
  organizer_name: 'Porto Yoga Club',
  organizer_bio: null,
  register_url: null,
  source_url: 'https://x',
  review_note: null,
  submitted_by: 'p1',
  created_at: '2026-11-27T10:00:00.000Z',
  tags: ['sync-partner'],
  women_only: false,
  lgbtq_friendly: false,
  pet_friendly: false,
  good_first_event: null,
  ...over,
});

describe('partner review drafts', () => {
  it('reads Porto times', () => {
    const d = toDraft(row());
    expect(d.date).toBe('2026-12-05');
    expect(d.start).toBe('18:00');
    expect(d.end).toBe('19:00');
  });

  it('lists what is missing', () => {
    expect(missingFields(toDraft(row()))).toEqual([]);
    const d = toDraft(row({ price_label: null, image_url: null, venue_name: null, description: ' ' }));
    expect(missingFields(d)).toEqual(['description', 'where', 'price_label', 'image_url']);
  });

  it('accepts an address without a venue', () => {
    expect(missingFields(toDraft(row({ venue_name: null, location: 'Rua X 1' })))).toEqual([]);
  });

  it('applies a bulk value only to the selected drafts', () => {
    const drafts = { a: toDraft(row()), b: toDraft(row({ id: 'b' })) };
    const next = applyBulk(drafts, ['b', 'missing'], 'price_label', 'Free');
    expect(next.a.price_label).toBe('€10');
    expect(next.b.price_label).toBe('Free');
    expect(sameDraft(next.a, drafts.a)).toBe(true);
    expect(sameDraft(next.b, drafts.b)).toBe(false);
  });

  it('saves blanks as null and late end times on the next day', () => {
    const d = { ...toDraft(row()), start: '23:00', end: '01:00', organizer_bio: '  ' };
    const p = draftToPatch(d);
    expect(p.organizer_bio).toBeNull();
    expect(p.time_label).toBe('23:00–01:00');
    expect(new Date(p.ends_at!).getTime()).toBeGreaterThan(new Date(p.starts_at).getTime());
  });
});
