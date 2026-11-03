import { Vibe } from '@/types/event';

/** Single source of truth for how each Vibe level is named, described and coloured. */
export const VIBES: { value: Vibe; label: string; emoji: string; description: string; color: string }[] = [
  { value: 'chill', label: 'Chill', emoji: '😌', description: 'Relaxed and low-pressure. Fine to arrive alone and join in at your own pace.', color: 'bg-vibe-chill text-vivid-foreground' },
  { value: 'social', label: 'Social', emoji: '💬', description: 'Built around conversation. Mingling is expected, but it stays easygoing.', color: 'bg-vibe-social text-vivid-ink' },
  { value: 'lively', label: 'Lively', emoji: '🔥', description: 'High energy and loud. Crowds, music and momentum.', color: 'bg-vibe-lively text-vivid-foreground' },
];

export const VIBE_VALUES: Vibe[] = VIBES.map((v) => v.value);

export const vibeMeta = (vibe: Vibe) => VIBES.find((v) => v.value === vibe) ?? VIBES[1];

/** Accepts the new vibe value or a legacy intensity value from older rows. */
export const toVibe = (value: string | null | undefined): Vibe => {
  if (value === 'chill' || value === 'social' || value === 'lively') return value;
  if (value === 'energetic') return 'lively';
  return 'social';
};
