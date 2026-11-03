import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EVENT_CATEGORIES, normalizeCategory } from '@/lib/categories';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const quoted = (text: string) => [...text.matchAll(/'([A-Z][^']+)'/g)].map((m) => m[1]);

describe('event categories', () => {
  it('scraper only assigns onboarding categories', () => {
    const src = read('supabase/functions/scrape-events/index.ts');
    const labels = [...src.matchAll(/\/[^\n]*?\/,\s*'([^']+)'\]/g)].map((m) => m[1]);
    expect(labels.length).toBeGreaterThan(10);
    for (const l of labels) expect(EVENT_CATEGORIES).toContain(l);
    expect(src).toContain("return 'Social networking';");
  });

  it('event parser uses exactly the onboarding categories', () => {
    const src = read('supabase/functions/parse-event/index.ts');
    const block = src.slice(src.indexOf('const CATEGORIES = ['), src.indexOf('];', src.indexOf('const CATEGORIES = [')));
    expect(new Set(quoted(block))).toEqual(new Set(EVENT_CATEGORIES));
  });

  it('maps legacy labels onto the onboarding vocabulary', () => {
    expect(normalizeCategory('Health & fitness')).toBe('Health & wellness');
    expect(normalizeCategory('Sports & fitness', 'The Shooting Experience')).toBe('Sports');
    expect(normalizeCategory('Sports & fitness', 'Air Up: Breathwork, Yoga & Aerial Yoga')).toBe('Health & wellness');
    expect(normalizeCategory('sports')).toBe('Sports');
    expect(normalizeCategory(null)).toBe('Social networking');
  });
});
