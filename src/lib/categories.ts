import { ONBOARDING_INTERESTS } from '@/lib/userProfile';

/**
 * The one category vocabulary for SYNC. It is exactly the list of interests a
 * user picks during onboarding, so an event's category always matches a filter.
 */
export const EVENT_CATEGORIES: string[] = ONBOARDING_INTERESTS.map((i) => i.label);

/** Older or source-specific labels, mapped onto the onboarding vocabulary. */
const LEGACY: Record<string, string> = {
  'health & fitness': 'Health & wellness',
  wellness: 'Health & wellness',
  fitness: 'Health & wellness',
  'sports & fitness': 'Sports',
  'outdoors activities': 'Outdoors activities',
  outdoors: 'Outdoors activities',
  social: 'Social networking',
  networking: 'Social networking',
  community: 'Social networking',
  professional: 'Professional development',
  'food & drinks': 'Dining & cooking',
  music: 'Music & live events',
  arts: 'Arts & theatre',
  'arts & culture': 'Arts & theatre',
  tech: 'Tech & AI',
  dancing: 'Dance',
};

const WELLNESS = /yoga|pilates|breathwork|wellness|wellbeing|meditation|mindful|barre|gym|fitness/;

/** Returns the onboarding category for any stored label (falls back to Social networking). */
export const normalizeCategory = (raw: string | null | undefined, title = ''): string => {
  const value = (raw ?? '').trim();
  const exact = EVENT_CATEGORIES.find((c) => c.toLowerCase() === value.toLowerCase());
  if (exact) return exact;
  const key = value.toLowerCase();
  // "Sports & fitness" covers both; yoga-type sessions belong under wellness.
  if (key === 'sports & fitness' && WELLNESS.test(title.toLowerCase())) return 'Health & wellness';
  return LEGACY[key] ?? 'Social networking';
};
