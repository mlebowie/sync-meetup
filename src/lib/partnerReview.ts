import { isoToLisbon, lisbonToIso, timeLabelFor } from '@/lib/lisbonTime';

/**
 * Partner submissions review (/curate → Partners). A partner's events are
 * edited as a table of drafts: changes stay local until Save, and the bulk bar
 * writes one value into every selected draft at once.
 */

export interface PartnerRow {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  venue_name: string | null;
  location: string | null;
  price_label: string | null;
  category: string | null;
  vibe: string | null;
  group_size: string | null;
  image_url: string | null;
  organizer_name: string | null;
  organizer_bio: string | null;
  register_url: string | null;
  source_url: string;
  review_note: string | null;
  submitted_by: string | null;
  created_at: string;
  tags: string[] | null;
  women_only: boolean | null;
  lgbtq_friendly: boolean | null;
  pet_friendly: boolean | null;
  good_first_event: boolean | null;
}

/** The editable copy of a row. Date and times are Porto wall-clock values. */
export interface PartnerDraft {
  title: string;
  description: string;
  date: string;
  start: string;
  end: string;
  venue_name: string;
  location: string;
  price_label: string;
  category: string;
  vibe: string;
  group_size: string;
  image_url: string;
  organizer_bio: string;
  register_url: string;
  women_only: boolean;
  lgbtq_friendly: boolean;
  pet_friendly: boolean;
  good_first_event: boolean;
}

export const toDraft = (r: PartnerRow): PartnerDraft => {
  const start = isoToLisbon(r.starts_at);
  return {
    title: r.title ?? '',
    description: r.description ?? '',
    date: start.date,
    start: start.time,
    end: r.ends_at ? isoToLisbon(r.ends_at).time : '',
    venue_name: r.venue_name ?? '',
    location: r.location ?? '',
    price_label: r.price_label ?? '',
    category: r.category ?? '',
    vibe: r.vibe ?? '',
    group_size: r.group_size ?? '',
    image_url: r.image_url ?? '',
    organizer_bio: r.organizer_bio ?? '',
    register_url: r.register_url ?? '',
    women_only: !!r.women_only,
    lgbtq_friendly: !!r.lgbtq_friendly,
    pet_friendly: !!r.pet_friendly,
    good_first_event: !!r.good_first_event,
  };
};

/** Everything a partner event needs before it can be published. */
export const MISSING_LABELS = {
  title: 'title',
  description: 'description',
  when: 'date and time',
  where: 'venue or address',
  price_label: 'price',
  category: 'category',
  image_url: 'photo',
} as const;

export type MissingKey = keyof typeof MISSING_LABELS;

export function missingFields(d: PartnerDraft): MissingKey[] {
  const out: MissingKey[] = [];
  if (!d.title.trim()) out.push('title');
  if (!d.description.trim()) out.push('description');
  if (!d.date || !d.start) out.push('when');
  if (!d.venue_name.trim() && !d.location.trim()) out.push('where');
  if (!d.price_label.trim()) out.push('price_label');
  if (!d.category.trim()) out.push('category');
  if (!d.image_url.trim()) out.push('image_url');
  return out;
}

export const sameDraft = (a: PartnerDraft, b: PartnerDraft) =>
  (Object.keys(a) as (keyof PartnerDraft)[]).every((k) => a[k] === b[k]);

/** Fields the bulk bar can set on every selected event. */
export type BulkField =
  | 'price_label'
  | 'venue_name'
  | 'location'
  | 'category'
  | 'vibe'
  | 'group_size'
  | 'start'
  | 'end'
  | 'image_url'
  | 'organizer_bio'
  | 'register_url'
  | 'women_only'
  | 'lgbtq_friendly'
  | 'pet_friendly'
  | 'good_first_event';

export const BULK_FIELDS: { field: BulkField; label: string; kind: 'text' | 'time' | 'url' | 'category' | 'vibe' | 'group' | 'flag' | 'long' }[] = [
  { field: 'price_label', label: 'Price', kind: 'text' },
  { field: 'venue_name', label: 'Venue', kind: 'text' },
  { field: 'location', label: 'Address', kind: 'text' },
  { field: 'category', label: 'Category', kind: 'category' },
  { field: 'start', label: 'Start time', kind: 'time' },
  { field: 'end', label: 'End time', kind: 'time' },
  { field: 'vibe', label: 'Vibe', kind: 'vibe' },
  { field: 'group_size', label: 'Group size', kind: 'group' },
  { field: 'image_url', label: 'Cover image link', kind: 'url' },
  { field: 'register_url', label: 'Registration link', kind: 'url' },
  { field: 'organizer_bio', label: 'Host bio', kind: 'long' },
  { field: 'women_only', label: 'Women only', kind: 'flag' },
  { field: 'lgbtq_friendly', label: 'LGBTQ+ friendly', kind: 'flag' },
  { field: 'pet_friendly', label: 'Pet friendly', kind: 'flag' },
  { field: 'good_first_event', label: 'Good first event', kind: 'flag' },
];

/** Writes one value into each selected draft; nothing is saved yet. */
export function applyBulk(
  drafts: Record<string, PartnerDraft>,
  ids: string[],
  field: BulkField,
  value: string | boolean,
): Record<string, PartnerDraft> {
  const next = { ...drafts };
  for (const id of ids) {
    if (!next[id]) continue;
    next[id] = { ...next[id], [field]: value } as PartnerDraft;
  }
  return next;
}

/** The database update for a draft. Blank text is saved as null. */
export function draftToPatch(d: PartnerDraft) {
  const blank = (v: string) => (v.trim() ? v.trim() : null);
  const startsAt = lisbonToIso(d.date, d.start);
  // An end time earlier than the start (e.g. 23:00–01:00) runs past midnight.
  let endsAt: string | null = d.end ? lisbonToIso(d.date, d.end) : null;
  if (endsAt && endsAt <= startsAt) endsAt = new Date(new Date(endsAt).getTime() + 86_400_000).toISOString();
  return {
    title: d.title.trim(),
    description: blank(d.description),
    starts_at: startsAt,
    ends_at: endsAt,
    time_label: timeLabelFor(d.start, d.end || null),
    venue_name: blank(d.venue_name),
    location: blank(d.location),
    price_label: blank(d.price_label),
    category: blank(d.category),
    vibe: blank(d.vibe),
    group_size: blank(d.group_size),
    image_url: blank(d.image_url),
    organizer_bio: blank(d.organizer_bio),
    register_url: blank(d.register_url),
    women_only: d.women_only,
    lgbtq_friendly: d.lgbtq_friendly,
    pet_friendly: d.pet_friendly,
    good_first_event: d.good_first_event,
  };
}
