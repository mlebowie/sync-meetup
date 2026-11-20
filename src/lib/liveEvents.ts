import { supabase } from '@/integrations/supabase/client';
import { Event, Participant, GroupSize, Recurrence } from '@/types/event';
import { toVibe } from '@/lib/vibe';
import { normalizeCategory } from '@/lib/categories';
import { mockParticipants, mockWomenParticipantIds } from '@/data/mockData';
import { startTime24, time24 } from '@/lib/startTime';

export interface EventRow {
  id: string;
  source: string;
  source_url: string;
  title: string;
  description: string | null;
  starts_at: string;
  time_label: string | null;
  venue_name: string | null;
  location: string | null;
  image_url: string | null;
  organizer_name: string | null;
  organizer_bio?: string | null;
  register_url?: string | null;
  whatsapp_url?: string | null;
  also_on?: string[] | null;
  organizer_url: string | null;
  category: string | null;
  tags: string[] | null;
  price_label: string | null;
  attendee_count: number | null;
  capacity: number | null;
  recurrence: string | null;
  series_key: string | null;
  vibe?: string | null;
  /** Legacy social-energy label, used only when vibe is missing. */
  intensity?: string | null;
  group_size: string | null;
  women_only: boolean | null;
  lgbtq_friendly: boolean | null;
  pet_friendly: boolean | null;
  good_first_event?: boolean | null;
  updated_at: string;
}

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1523580494757-588c40d9d78b?w=1200&q=80&auto=format&fit=crop';

/** Stable small hash so the same event always gets the same faces/numbers. */
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

const womenParticipants = mockParticipants.filter((p) => mockWomenParticipantIds.includes(p.id));

/** Sample attendee faces; women-only events only ever show women. */
function facesFor(id: string, womenOnly = false): Participant[] {
  const pool = womenOnly ? womenParticipants : mockParticipants;
  const h = hash(id);
  const count = Math.min(2 + (h % 3), pool.length);
  const start = h % pool.length;
  return Array.from({ length: count }, (_, i) => pool[(start + i) % pool.length]);
}

function timeLabel(date: Date, raw: string | null): string {
  // Start time only, 24-hour clock ("18:30"), even when the label is a range.
  if (raw && /\d/.test(raw)) return startTime24(raw);
  return time24(date);
}

export function rowToEvent(row: EventRow): Event {
  const date = new Date(row.starts_at);
  const h = hash(row.id);
  const soldOut = (row.tags ?? []).includes('sold-out');
  // Control tags change how the event behaves; they aren't shown as topics.
  const visibleTags = (row.tags ?? []).filter(t => t !== 'sold-out' && t !== 'sync-partner' && t !== 'featured');
  const capacity = Math.max(
    (row.attendee_count ?? 6 + (h % 22)) + 1,
    row.capacity ?? (row.attendee_count ?? 6 + (h % 22)) + 4 + (h % 14),
  );
  // Sold-out events show as full, so the card offers the waitlist instead of registration.
  const attendees = soldOut ? capacity : row.attendee_count ?? 6 + (h % 22);
  const source = (['meetup', 'eventbrite', 'luma', 'agenda-porto', 'porto-coffee-week', 'expat-girls-porto', 'partner', 'fisga'] as const).includes(
    row.source as 'meetup',
  )
    ? (row.source as Event['source'])
    : 'luma';

  return {
    id: row.id,
    title: row.title,
    description: row.description || `${row.category ?? 'Social'} event in Porto. Details on ${source}.`,
    date,
    time: timeLabel(date, row.time_label),
    location: row.location || row.venue_name || 'Porto, Portugal',
    imageUrl: row.image_url || FALLBACK_IMAGE,
    source,
    vibe: toVibe(row.vibe ?? row.intensity),
    groupSize: (row.group_size as GroupSize) ?? 'medium',
    maxParticipants: capacity,
    currentParticipants: attendees,
    participants: facesFor(row.id, row.women_only ?? false),
    category: normalizeCategory(row.category, row.title),
    tags: visibleTags.length ? visibleTags : [row.category || 'social'],
    partner: (row.tags ?? []).includes('sync-partner'),
    featured: (row.tags ?? []).includes('featured'),
    live: true,
    seriesId: row.series_key ?? undefined,
    recurrence: (row.recurrence as Recurrence) ?? 'one-off',
    womenOnly: row.women_only ?? false,
    lgbtqFriendly: row.lgbtq_friendly ?? false,
    petFriendly: row.pet_friendly ?? false,
    goodFirstEvent: row.good_first_event ?? false,
    trending: attendees > 40,
    sourceUrl: row.source_url,
    registerUrl: row.register_url || undefined,
    whatsappUrl: row.whatsapp_url || undefined,
    alsoOn: row.also_on?.length ? row.also_on : undefined,
    priceLabel: row.price_label ?? undefined,
    organizer: row.organizer_name
      ? {
          id: `org-${hash(row.organizer_name)}`,
          name: row.organizer_name,
          type: 'company',
          rating: 4.3 + ((h % 6) / 10),
          reviewCount: 12 + (h % 90),
          location: 'Porto, Portugal',
          eventsHosted: 4 + (h % 40),
          // Only the host's own words, entered while curating.
          bio: row.organizer_bio?.trim() || undefined,
          social: {},
        }
      : undefined,
  };
}

/** Real events collected from Eventbrite, Meetup and Lu.ma. */
export async function fetchLiveEvents(): Promise<{ events: Event[]; updatedAt: Date | null }> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('review_status', 'approved')
    .gte('starts_at', new Date(Date.now() - 2 * 3600_000).toISOString())
    .order('starts_at', { ascending: true })
    .limit(200);

  if (error) throw error;
  const rows = (data ?? []) as unknown as EventRow[];
  const updated = rows.reduce<number>((max, r) => Math.max(max, new Date(r.updated_at).getTime()), 0);
  return { events: rows.map(rowToEvent), updatedAt: updated ? new Date(updated) : null };
}
