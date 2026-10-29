import { supabase } from '@/integrations/supabase/client';
import { Event, Participant, ActivityLevel, Intensity, GroupSize, Recurrence } from '@/types/event';
import { mockParticipants } from '@/data/mockData';

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
  organizer_url: string | null;
  category: string | null;
  tags: string[] | null;
  price_label: string | null;
  attendee_count: number | null;
  capacity: number | null;
  recurrence: string | null;
  series_key: string | null;
  activity_level: string | null;
  intensity: string | null;
  group_size: string | null;
  women_only: boolean | null;
  lgbtq_friendly: boolean | null;
  pet_friendly: boolean | null;
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

function facesFor(id: string): Participant[] {
  const h = hash(id);
  const count = 2 + (h % 3);
  const start = h % mockParticipants.length;
  return Array.from({ length: count }, (_, i) => mockParticipants[(start + i) % mockParticipants.length]);
}

function timeLabel(date: Date, raw: string | null): string {
  if (raw && /\d/.test(raw)) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
    if (m) {
      let h = Number(m[1]);
      const suffix = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h}:${m[2]} ${suffix}`;
    }
    return raw;
  }
  let h = date.getHours();
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${date.getMinutes().toString().padStart(2, '0')} ${suffix}`;
}

export function rowToEvent(row: EventRow): Event {
  const date = new Date(row.starts_at);
  const h = hash(row.id);
  const soldOut = (row.tags ?? []).includes('sold-out');
  // Control tags change how the event behaves; they aren't shown as topics.
  const visibleTags = (row.tags ?? []).filter(t => t !== 'sold-out' && t !== 'sync-partner');
  const capacity = Math.max(
    (row.attendee_count ?? 6 + (h % 22)) + 1,
    row.capacity ?? (row.attendee_count ?? 6 + (h % 22)) + 4 + (h % 14),
  );
  // Sold-out events show as full, so the card offers the waitlist instead of registration.
  const attendees = soldOut ? capacity : row.attendee_count ?? 6 + (h % 22);
  const source = (['meetup', 'eventbrite', 'luma', 'agenda-porto', 'porto-coffee-week', 'expat-girls-porto'] as const).includes(
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
    activityLevel: (row.activity_level as ActivityLevel) ?? 'moderate',
    intensity: (row.intensity as Intensity) ?? 'social',
    groupSize: (row.group_size as GroupSize) ?? 'medium',
    maxParticipants: capacity,
    currentParticipants: attendees,
    participants: facesFor(row.id),
    category: row.category || 'Social',
    tags: visibleTags.length ? visibleTags : [row.category || 'social'],
    partner: (row.tags ?? []).includes('sync-partner'),
    seriesId: row.series_key ?? undefined,
    recurrence: (row.recurrence as Recurrence) ?? 'one-off',
    womenOnly: row.women_only ?? false,
    lgbtqFriendly: row.lgbtq_friendly ?? false,
    petFriendly: row.pet_friendly ?? false,
    trending: attendees > 40,
    sourceUrl: row.source_url,
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
          bio: `Hosts ${row.category || 'social'} events around Porto.`,
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
