import { describe, expect, it } from 'vitest';
import { toVibe, vibeMeta, VIBE_VALUES } from '@/lib/vibe';

describe('vibe', () => {
  it('has exactly three levels in order', () => {
    expect(VIBE_VALUES).toEqual(['chill', 'social', 'lively']);
  });

  it('maps legacy intensity values onto the new scale', () => {
    expect(toVibe('chill')).toBe('chill');
    expect(toVibe('social')).toBe('social');
    expect(toVibe('energetic')).toBe('lively');
    expect(toVibe(null)).toBe('social');
    expect(toVibe('unknown')).toBe('social');
  });

  it('labels each level for the card pill', () => {
    expect(vibeMeta('lively').label).toBe('Lively');
  });
});
