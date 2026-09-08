import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const GATEWAY = 'https://connector-gateway.lovable.dev/firecrawl/v2';
const AI_GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** Safety limits — one run never does more than this. */
const MAX_EVENTS_PER_SOURCE = 30;
const MAX_CLASSIFY_PER_RUN = 40;
const LEASE_MINUTES = 10;

type SourceId = 'eventbrite' | 'meetup' | 'luma';

const SOURCES: { id: SourceId; url: string }[] = [
  { id: 'eventbrite', url: 'https://www.eventbrite.com/d/portugal--porto/events/' },
  { id: 'meetup', url: 'https://www.meetup.com/find/?location=pt--Porto&source=EVENTS' },
  { id: 'luma', url: 'https://lu.ma/porto' },
];

const EVENT_SCHEMA = {
  type: 'object',
  properties: {
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          url: { type: 'string' },
          date: { type: 'string', description: 'Start date in YYYY-MM-DD, or the date text shown' },
          time: { type: 'string', description: 'Start time as shown, e.g. 19:30' },
          venue: { type: 'string' },
          address: { type: 'string' },
          image_url: { type: 'string' },
          organizer: { type: 'string' },
          category: { type: 'string' },
          price: { type: 'string' },
          attendees: { type: 'number' },
          is_recurring: { type: 'boolean' },
        },
        required: ['title', 'url'],
      },
    },
  },
  required: ['events'],
};

interface RawEvent {
  title?: string;
  description?: string;
  url?: string;
  date?: string;
  time?: string;
  venue?: string;
  address?: string;
  image_url?: string;
  organizer?: string;
  category?: string;
  price?: string;
  attendees?: number;
  is_recurring?: boolean;
}

class Denied extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function firecrawlScrape(url: string): Promise<RawEvent[]> {
  const res = await fetch(`${GATEWAY}/scrape`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': `${FIRECRAWL_API_KEY}`,
    },
    body: JSON.stringify({
      url,
      onlyMainContent: true,
      waitFor: 3000,
      formats: [
        {
          type: 'json',
          schema: EVENT_SCHEMA,
          prompt:
            'Extract every upcoming public event listed on this page that takes place in or around Porto, Portugal. ' +
            'Use absolute URLs. Include the cover image URL when present. Skip navigation links and adverts.',
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Firecrawl ${url} failed [${res.status}]: ${body}`);
    throw new Denied(res.status, `Firecrawl request failed: ${body.slice(0, 400)}`);
  }

  const data = await res.json();
  const json = data?.json ?? data?.data?.json ?? {};
  const events = Array.isArray(json?.events) ? json.events : [];
  return events.slice(0, MAX_EVENTS_PER_SOURCE);
}

function sourceEventId(source: SourceId, raw: RawEvent): string | null {
  const url = raw.url?.trim();
  if (!url) return null;
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname}`.replace(/\/$/, '');
  } catch {
    return `${source}:${raw.title}`.slice(0, 200);
  }
}

function parseStart(raw: RawEvent): Date | null {
  const date = (raw.date ?? '').trim();
  if (!date) return null;
  const time = (raw.time ?? '').trim();
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? `${date}T${/^\d{1,2}:\d{2}/.test(time) ? time.padStart(5, '0') : '19:00'}:00+01:00`
    : null;
  const parsed = new Date(iso ?? `${date} ${time}`);
  if (isNaN(parsed.getTime())) return null;
  // Ignore anything in the past or absurdly far out.
  const now = Date.now();
  if (parsed.getTime() < now - 6 * 3600_000) return null;
  if (parsed.getTime() > now + 200 * 86400_000) return null;
  return parsed;
}

const HIGH = ['hike', 'run', 'running', 'trail', 'surf', 'football', 'padel', 'climb', 'bike', 'cycling', 'crossfit', 'swim', 'dance', 'bootcamp', 'volleyball', 'tennis', 'kayak', 'yoga flow'];
const LOW = ['language exchange', 'book', 'coffee', 'wine', 'tasting', 'talk', 'workshop', 'meditation', 'board game', 'brunch', 'film', 'cinema', 'museum', 'photography walk'];

function keywordDerive(raw: RawEvent) {
  const text = `${raw.title ?? ''} ${raw.description ?? ''} ${raw.category ?? ''}`.toLowerCase();
  const high = HIGH.some((k) => text.includes(k));
  const low = !high && LOW.some((k) => text.includes(k));
  const activity_level = high ? 'high' : low ? 'low' : 'moderate';
  const intensity = high ? 'energetic' : low ? 'chill' : 'social';
  const attendees = raw.attendees ?? 0;
  const group_size = attendees > 60 ? 'large' : attendees > 20 ? 'medium' : 'small';
  return {
    activity_level,
    intensity,
    group_size,
    women_only: /women only|women-only|ladies only/.test(text),
    lgbtq_friendly: /lgbt|queer|pride/.test(text),
    pet_friendly: /dog|pet friendly|pet-friendly/.test(text),
  };
}

function seriesKey(raw: RawEvent): string | null {
  if (!raw.is_recurring) return null;
  return (raw.title ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\b(week|weekly|edition|no|nr|#)\s*\d+\b/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80) || null;
}

async function classifyPending(supabase: ReturnType<typeof createClient>) {
  const { data: pending } = await supabase
    .from('events')
    .select('id,title,description,category')
    .eq('classified', false)
    .limit(MAX_CLASSIFY_PER_RUN);

  if (!pending?.length) return 0;

  const res = await fetch(AI_GATEWAY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LOVABLE_API_KEY}` },
    body: JSON.stringify({
      model: 'google/gemini-3.8-flash',
      messages: [
        {
          role: 'system',
          content:
            'You label social events. For each event return activity_level (low|moderate|high), ' +
            'intensity (chill|social|energetic) and group_size (small|medium|large). ' +
            'Reply with JSON only: {"labels":[{"id":"...","activity_level":"...","intensity":"...","group_size":"..."}]}',
        },
        {
          role: 'user',
          content: JSON.stringify(
            pending.map((e: Record<string, unknown>) => ({
              id: e.id,
              title: e.title,
              category: e.category,
              description: String(e.description ?? '').slice(0, 400),
            })),
          ),
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`AI classification failed [${res.status}]: ${body}`);
    if (res.status === 402 || res.status === 403) throw new Denied(res.status, body.slice(0, 400));
    // Keyword values already stored — just leave them unclassified for the next run.
    return 0;
  }

  const payload = await res.json();
  const content: string = payload?.choices?.[0]?.message?.content ?? '';
  let labels: Record<string, string>[] = [];
  try {
    labels = JSON.parse(content.replace(/```json|```/g, '').trim())?.labels ?? [];
  } catch {
    console.error('Could not parse AI labels');
  }

  let updated = 0;
  for (const label of labels) {
    if (!label?.id) continue;
    const patch: Record<string, unknown> = { classified: true };
    if (['low', 'moderate', 'high'].includes(label.activity_level)) patch.activity_level = label.activity_level;
    if (['chill', 'social', 'energetic'].includes(label.intensity)) patch.intensity = label.intensity;
    if (['small', 'medium', 'large'].includes(label.group_size)) patch.group_size = label.group_size;
    const { error } = await supabase.from('events').update(patch).eq('id', label.id);
    if (!error) updated++;
  }
  return updated;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (!LOVABLE_API_KEY || !FIRECRAWL_API_KEY) {
    return new Response(JSON.stringify({ error: 'Scraper is not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const nowIso = new Date().toISOString();

  // --- single-flight lease + paused guard -----------------------------------
  const { data: latest } = await supabase
    .from('event_scrape_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest?.status === 'running' && latest.lease_until && latest.lease_until > nowIso) {
    return new Response(JSON.stringify({ skipped: 'another run holds the lease' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const paused = latest?.status === 'paused';
  // While paused we probe a single source only; success clears the pause.
  const sources = paused ? SOURCES.slice(0, 1) : SOURCES;

  const { data: run, error: runError } = await supabase
    .from('event_scrape_runs')
    .insert({
      status: 'running',
      lease_until: new Date(Date.now() + LEASE_MINUTES * 60_000).toISOString(),
    })
    .select('id')
    .single();

  if (runError || !run) {
    return new Response(JSON.stringify({ error: 'Could not start run', details: runError?.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const counts: Record<string, number> = {};
  const errors: string[] = [];
  let upserted = 0;
  let pausedReason: string | null = null;

  for (const source of sources) {
    if (pausedReason) break;
    try {
      const raws = await firecrawlScrape(source.url);
      let saved = 0;

      for (const raw of raws) {
        const id = sourceEventId(source.id, raw);
        const starts = parseStart(raw);
        if (!id || !raw.title || !starts) continue;

        const derived = keywordDerive(raw);
        const row = {
          source: source.id,
          source_event_id: id,
          source_url: raw.url!,
          title: raw.title.trim().slice(0, 300),
          description: (raw.description ?? '').slice(0, 4000) || null,
          starts_at: starts.toISOString(),
          time_label: raw.time?.trim() || null,
          venue_name: raw.venue?.trim() || null,
          location: [raw.venue, raw.address].filter(Boolean).join(', ').slice(0, 300) || 'Porto, Portugal',
          image_url: raw.image_url?.startsWith('http') ? raw.image_url : null,
          organizer_name: raw.organizer?.trim() || null,
          category: raw.category?.trim()?.slice(0, 60) || 'Social',
          price_label: raw.price?.trim()?.slice(0, 60) || null,
          attendee_count: typeof raw.attendees === 'number' ? Math.max(0, Math.round(raw.attendees)) : null,
          capacity: typeof raw.attendees === 'number' ? Math.max(12, Math.round(raw.attendees * 1.4)) : null,
          recurrence: raw.is_recurring ? 'weekly' : 'one-off',
          series_key: seriesKey(raw),
          ...derived,
          last_seen_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('events')
          .upsert(row, { onConflict: 'source,source_event_id' });
        if (error) {
          errors.push(`${source.id}: ${error.message}`);
        } else {
          saved++;
          upserted++;
        }
      }
      counts[source.id] = saved;
    } catch (e) {
      const err = e as Denied;
      const status = err.status ?? 0;
      console.error(`Source ${source.id} failed:`, err.message);
      if (status === 402 || status === 403 || status === 429) {
        pausedReason = `${source.id} returned ${status}: ${err.message}`.slice(0, 500);
      } else {
        errors.push(`${source.id}: ${err.message}`);
      }
    }
  }

  let classified = 0;
  if (!pausedReason) {
    try {
      classified = await classifyPending(supabase);
    } catch (e) {
      const err = e as Denied;
      pausedReason = `AI labelling returned ${err.status}: ${err.message}`.slice(0, 500);
    }
  }

  // Drop events that are over and no longer listed anywhere.
  await supabase
    .from('events')
    .delete()
    .lt('starts_at', new Date(Date.now() - 2 * 86400_000).toISOString());

  await supabase
    .from('event_scrape_runs')
    .update({
      status: pausedReason ? 'paused' : errors.length && upserted === 0 ? 'failed' : 'completed',
      paused_reason: pausedReason,
      finished_at: new Date().toISOString(),
      lease_until: null,
      source_counts: counts,
      events_upserted: upserted,
      error_details: errors.length ? errors.join(' | ').slice(0, 2000) : null,
    })
    .eq('id', run.id);

  return new Response(
    JSON.stringify({ ok: !pausedReason, counts, upserted, classified, paused: pausedReason, errors }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
