import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const GATEWAY = 'https://connector-gateway.lovable.dev/firecrawl/v2';
const AI_GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** Safety limits — one run never does more than this. */
const MAX_EVENTS_PER_PAGE = 30;
const MAX_PAGES_PER_SOURCE = 2;
/** Per-source page budget; Lu.ma needs more pages because each calendar is small. */
const MAX_PAGES: Record<'eventbrite' | 'meetup' | 'luma' | 'agenda-porto', number> = {
  eventbrite: 5,
  meetup: 6,
  luma: 8,
  'agenda-porto': 9,
};
const MAX_CLASSIFY_PER_RUN = 40;
const LEASE_MINUTES = 10;

type SourceId = 'eventbrite' | 'meetup' | 'luma' | 'agenda-porto';

const SOURCE_PAGES: Record<SourceId, string[]> = {
  eventbrite: [
    'https://www.eventbrite.com/d/portugal--porto/all-events/',
    'https://www.eventbrite.com/d/portugal--porto/events/?page=2',
    'https://www.eventbrite.com/d/portugal--porto/sports--fitness--events/',
    'https://www.eventbrite.com/d/portugal--porto/health--events/',
    'https://www.eventbrite.com/d/portugal--porto/yoga/',
  ],
  meetup: [
    'https://www.meetup.com/find/?location=pt--Porto&source=EVENTS&distance=tenMiles',
    'https://www.meetup.com/find/?location=pt--Porto&source=EVENTS&categoryId=242',
    // Sports & fitness
    'https://www.meetup.com/find/?location=pt--Porto&source=EVENTS&categoryId=436&distance=tenMiles',
    // Health & wellbeing
    'https://www.meetup.com/find/?location=pt--Porto&source=EVENTS&categoryId=548&distance=tenMiles',
    'https://www.meetup.com/find/?location=pt--Porto&source=EVENTS&keywords=yoga&distance=tenMiles',
    'https://www.meetup.com/find/?location=pt--Porto&source=EVENTS&keywords=running%20hiking%20surf&distance=twentyFiveMiles',
  ],
  // Lu.ma has no city index page, so read known Porto community calendars directly.
  luma: [
    'https://lu.ma/porto',
    'https://lu.ma/portugal',
    'https://lu.ma/portotech',
    'https://lu.ma/portoweb3',
    'https://lu.ma/wellnessporto',
  ],
  // Porto's official city agenda, read through its English section listings.
  'agenda-porto': [
    'https://www.agenda-porto.pt/en/calendario/',
    'https://www.agenda-porto.pt/en/seccao/sports-and-motion/',
    'https://www.agenda-porto.pt/en/seccao/ao-fresco/',
    'https://www.agenda-porto.pt/en/seccao/musica-e-clubbing/',
    'https://www.agenda-porto.pt/en/seccao/art-andamp-exhibitions/',
    'https://www.agenda-porto.pt/en/seccao/stage/',
    'https://www.agenda-porto.pt/en/seccao/talks/',
    'https://www.agenda-porto.pt/en/seccao/film/',
    'https://www.agenda-porto.pt/en/seccao/families/',
  ],
};

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
          date_text: { type: 'string' },
          iso_date: { type: 'string' },
          time: { type: 'string' },
          venue: { type: 'string' },
          address: { type: 'string' },
          image_url: { type: 'string' },
          organizer: { type: 'string' },
          category: { type: 'string' },
          price: { type: 'string' },
          attendees: { type: 'number' },
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
  date_text?: string;
  iso_date?: string;
  time?: string;
  venue?: string;
  address?: string;
  image_url?: string;
  organizer?: string;
  category?: string;
  price?: string;
  attendees?: number;
}

class Denied extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function fcHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    'X-Connection-Api-Key': `${FIRECRAWL_API_KEY}`,
  };
}

async function firecrawl(path: string, body: unknown) {
  const res = await fetch(`${GATEWAY}${path}`, {
    method: 'POST',
    headers: fcHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Firecrawl ${path} failed [${res.status}]: ${text}`);
    throw new Denied(res.status, `Firecrawl ${path} failed: ${text.slice(0, 300)}`);
  }
  return await res.json();
}

async function scrapeListing(url: string): Promise<RawEvent[]> {
  const today = new Date().toISOString().slice(0, 10);
  const data = await firecrawl('/scrape', {
    url,
    onlyMainContent: true,
    waitFor: 5000,
    formats: [
      {
        type: 'json',
        schema: EVENT_SCHEMA,
        prompt:
          `Today is ${today}. Extract every upcoming event listed on this page that happens in or near Porto, Portugal. ` +
          'For each event give: title, absolute url, date_text exactly as displayed on the card, ' +
          'iso_date (YYYY-MM-DD resolved from date_text relative to today — never guess a past year), ' +
          'time (HH:MM 24-hour), venue, address, image_url, organizer, category, price, attendees count, ' +
          'and a one or two sentence description. Skip navigation links, adverts and anything that is not an event.',
      },
    ],
  });
  const json = data?.json ?? data?.data?.json ?? {};
  const events = Array.isArray(json?.events) ? json.events : [];
  return events.slice(0, MAX_EVENTS_PER_PAGE);
}

/**
 * Lu.ma has no Porto city index, so start from known Porto calendars and top up
 * with search discovery (tech, wellness, creative communities) until the budget
 * for the source is used.
 */
async function lumaPages(): Promise<string[]> {
  const urls: string[] = [...SOURCE_PAGES.luma];
  const queries = [
    'site:lu.ma Porto Portugal events calendar',
    'site:lu.ma Porto yoga wellness OR fitness OR run event',
  ];

  for (const query of queries) {
    if (urls.length >= MAX_PAGES.luma) break;
    try {
      const data = await firecrawl('/search', { query, limit: 10 });
      const results: { url?: string }[] = data?.data?.web ?? data?.web ?? [];
      for (const r of results) {
        const url = r?.url;
        if (!url || !/lu\.ma\//.test(url)) continue;
        const clean = url.split('?')[0];
        if (!urls.includes(clean)) urls.push(clean);
        if (urls.length >= MAX_PAGES.luma) break;
      }
    } catch (err) {
      console.error(`Lu.ma discovery failed for "${query}": ${err}`);
    }
  }

  return urls.slice(0, MAX_PAGES.luma);
}

function sourceEventId(source: SourceId, raw: RawEvent): string | null {
  const url = raw.url?.trim();
  if (!url) return null;
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname}`.replace(/\/$/, '').slice(0, 200);
  } catch {
    return `${source}:${raw.title}`.slice(0, 200);
  }
}

function withinWindow(d: Date): boolean {
  const now = Date.now();
  if (isNaN(d.getTime())) return false;
  if (d.getTime() < now - 6 * 3600_000) return false;
  if (d.getTime() > now + 200 * 86400_000) return false;
  return true;
}

function parseStart(raw: RawEvent): Date | null {
  const iso = (raw.iso_date ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const time = (raw.time ?? '').trim();
  const hhmm = /^(\d{1,2}):(\d{2})/.exec(time);
  const clock = hhmm ? `${hhmm[1].padStart(2, '0')}:${hhmm[2]}` : '19:00';
  // Porto is UTC+1 in summer; the small offset drift is acceptable for display.
  const parsed = new Date(`${iso}T${clock}:00+01:00`);
  return withinWindow(parsed) ? parsed : null;
}

/**
 * Listing cards are read by an AI and their dates drift, so the event page's own
 * schema.org startDate is treated as the truth whenever it is unambiguous.
 */
async function verifiedStart(url: string): Promise<Date | null> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const found = [...html.matchAll(/"startDate"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
    const distinct = [...new Set(found)];
    // Calendar / listing pages carry many events — only a single date is trustworthy.
    if (distinct.length !== 1) return null;
    const parsed = new Date(distinct[0]);
    return withinWindow(parsed) ? parsed : null;
  } catch (err) {
    console.error(`Could not verify date for ${url}: ${err}`);
    return null;
  }
}

/** Wall-clock time in Porto, used for the card's time label. */
function portoTimeLabel(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Lisbon',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}


const HIGH = ['hike', 'run', 'running', 'trail', 'surf', 'football', 'padel', 'climb', 'bike', 'cycling', 'crossfit', 'swim', 'dance', 'bootcamp', 'volleyball', 'tennis', 'kayak'];
const LOW = ['language exchange', 'book', 'coffee', 'wine', 'tasting', 'talk', 'workshop', 'meditation', 'board game', 'brunch', 'film', 'cinema', 'museum', 'conference'];

/** SYNC interest labels — event cards and interest filters both rely on these. */
const CATEGORY_RULES: [RegExp, string][] = [
  [/pop-?up/, 'Pop-up events'],
  [/chess|trivia|quiz|board game|boardgame|gaming|video game|poker|dungeons/, 'Games'],
  [/volunteer|charity|non-?profit|ngo|fundrais|beach clean|clean-?up/, 'Charity & non-profit'],
  [/language exchange|languages|portuguese class|english class|conversation club|intercambio/, 'Languages'],
  [/church|faith|bible|christian|muslim|mosque|synagogue|religio/, 'Religion'],
  [/tennis|padel|football|soccer|futsal|basketball|volleyball|beach volley|run club|running club|jogging|marathon|\b5k\b|\b10k\b|bouldering|climbing|surf|skate|swimming|cycling|bike ride|martial arts|jiu-?jitsu|boxing|muay thai|rugby|golf|\bsports?\b/, 'Sports'],
  [/yoga|pilates|barre|hyrox|crossfit|bootcamp|calisthenic|nutrition|gym|fitness|wellness|wellbeing|well-?being|ice bath|cold plunge|sauna|spa day/, 'Health & fitness'],
  [/meditation|mindful|spiritual|reiki|astrolog|sound bath|sound healing|kirtan|tarot|retiro|retreat|chakra|kundalini|ecstatic dance|cacao|shamanic|breathwork|cuddle party/, 'Spirituality'],
  [/hike|hiking|trail|kayak|paddle ?board|nature walk|camping|outdoor|picnic|day trip|birdwatch|forest bathing|sunrise walk|sunset walk|caminhada|walking holiday|camino/, 'Outdoors activities'],
  [/ ai |artificial intelligence|machine learning|tech|developer|software|coding|data|cyber|security|blockchain|robotic/, 'Tech & AI'],
  [/concert|live music|dj |salsa|bachata|kizomba|dance|dancing|band|gig|vinyl|jazz/, 'Music & live events'],
  [/comedy|stand-?up|theatre|theater|improv|art |arts|gallery|exhibition|painting|photograph|writing|film|cinema|book club|poetry/, 'Arts & theatre'],
  [/dinner|brunch|lunch|food|cooking|wine tasting|tasting|restaurant|supper|bbq|coffee/, 'Dining & cooking'],
  [/workshop|course|lecture|class|seminar|masterclass|talk|philosophy|learn/, 'Education'],
  [/founder|startup|entrepreneur|business|career|professional|conference|b2b|freelanc|coworking/, 'Professional development'],
  [/expat|nomad|international|cultur|heritage|museum|city tour/, 'Cultural exchange'],
];

function canonicalCategory(raw: RawEvent): string {
  // The title is the strongest signal; only fall back to the blurb when the
  // title says nothing useful, so a stray word in a long description cannot
  // hijack the label.
  const title = ` ${raw.title ?? ''} ${raw.category ?? ''} `.toLowerCase();
  for (const [re, label] of CATEGORY_RULES) if (re.test(title)) return label;
  const blob = ` ${raw.title ?? ''} ${raw.description ?? ''} ${raw.category ?? ''} `.toLowerCase();
  for (const [re, label] of CATEGORY_RULES) if (re.test(blob)) return label;
  return 'Social networking';
}

function keywordDerive(raw: RawEvent) {
  const text = `${raw.title ?? ''} ${raw.description ?? ''} ${raw.category ?? ''}`.toLowerCase();
  const high = HIGH.some((k) => text.includes(k));
  const low = !high && LOW.some((k) => text.includes(k));
  const attendees = raw.attendees ?? 0;
  return {
    activity_level: high ? 'high' : low ? 'low' : 'moderate',
    intensity: high ? 'energetic' : low ? 'chill' : 'social',
    group_size: attendees > 60 ? 'large' : attendees > 20 ? 'medium' : 'small',
    women_only: /women only|women-only|ladies only|só para mulheres/.test(text),
    lgbtq_friendly: /lgbt|queer|pride/.test(text),
    pet_friendly: /dog walk|dog-friendly|pet friendly|pet-friendly/.test(text),
  };
}

function recurrenceOf(raw: RawEvent): { recurrence: string; series_key: string | null } {
  const label = `${raw.date_text ?? ''}`.toLowerCase();
  let recurrence = 'one-off';
  if (/every two weeks|biweekly|every other/.test(label)) recurrence = 'biweekly';
  else if (/every week|weekly|every (mon|tue|wed|thu|fri|sat|sun)/.test(label)) recurrence = 'weekly';
  else if (/every month|monthly/.test(label)) recurrence = 'monthly';

  if (recurrence === 'one-off') return { recurrence, series_key: null };
  const key = (raw.title ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80);
  return { recurrence, series_key: key || null };
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
            'You label social events for a meet-people app. For each event return activity_level (low|moderate|high), ' +
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
              description: String(e.description ?? '').slice(0, 300),
            })),
          ),
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`AI classification failed [${res.status}]: ${body}`);
    if (res.status === 402 || res.status === 403) throw new Denied(res.status, body.slice(0, 300));
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

  // Optional narrowing so a run can focus on one source (keeps each run inside
  // the edge runtime's request budget).
  let requested: string[] = [];
  try {
    const body = await req.json();
    if (Array.isArray(body?.sources)) requested = body.sources.map((s: unknown) => String(s));
  } catch {
    // no body — full run
  }
  const allSources: SourceId[] = ['eventbrite', 'meetup', 'luma'];
  const sourceIds: SourceId[] = paused
    ? ['eventbrite']
    : requested.length
      ? allSources.filter((s) => requested.includes(s))
      : allSources;

  // Runs must finish well inside the edge idle limit, so stop collecting after this.
  const DEADLINE = Date.now() + 110_000;

  // Events already stored with a future start need no re-verification, which is
  // the slow part of a run.
  const { data: knownRows } = await supabase
    .from('events')
    .select('source,source_event_id')
    .gte('starts_at', new Date().toISOString());
  const known = new Set(
    (knownRows ?? []).map((r: Record<string, unknown>) => `${r.source}:${r.source_event_id}`),
  );

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

  for (const source of sourceIds) {
    if (pausedReason || Date.now() > DEADLINE) break;
    counts[source] = 0;
    try {
      const budget = paused ? MAX_PAGES_PER_SOURCE : MAX_PAGES[source];
      const pages =
        source === 'luma' ? (await lumaPages()).slice(0, budget) : SOURCE_PAGES[source].slice(0, budget);

      for (const page of pages) {
        if (pausedReason || Date.now() > DEADLINE) break;
        const raws = paused ? (await scrapeListing(page)).slice(0, 5) : await scrapeListing(page);

        for (const raw of raws) {
          if (Date.now() > DEADLINE) break;
          const id = sourceEventId(source, raw);
          // Already stored and still upcoming: keep it and move on.
          if (id && known.has(`${source}:${id}`)) continue;
          const listed = parseStart(raw);
          const confirmed = raw.url ? await verifiedStart(raw.url) : null;
          const starts = confirmed ?? listed;
          if (!id || !raw.title || !starts) continue;

          const { recurrence, series_key } = recurrenceOf(raw);
          const row = {
            source,
            source_event_id: id,
            source_url: raw.url!,
            title: raw.title.trim().slice(0, 300),
            description: (raw.description ?? '').slice(0, 4000) || null,
            starts_at: starts.toISOString(),
            time_label: confirmed
              ? portoTimeLabel(confirmed)
              : raw.time?.trim()?.slice(0, 20) || null,

            venue_name: raw.venue?.trim()?.slice(0, 200) || null,
            location:
              [raw.venue, raw.address].filter(Boolean).join(', ').slice(0, 300) || 'Porto, Portugal',
            image_url: raw.image_url?.startsWith('http') ? raw.image_url : null,
            organizer_name: raw.organizer?.trim()?.slice(0, 200) || null,
            category: canonicalCategory(raw),
            price_label: raw.price?.trim()?.slice(0, 60) || null,
            attendee_count:
              typeof raw.attendees === 'number' && raw.attendees > 0 ? Math.round(raw.attendees) : null,
            capacity:
              typeof raw.attendees === 'number' && raw.attendees > 0
                ? Math.max(12, Math.round(raw.attendees * 1.4))
                : null,
            recurrence,
            series_key,
            ...keywordDerive(raw),
            last_seen_at: new Date().toISOString(),
          };

          const { error } = await supabase
            .from('events')
            .upsert(row, { onConflict: 'source,source_event_id' });
          if (error) {
            errors.push(`${source}: ${error.message}`);
          } else {
            counts[source] += 1;
            upserted += 1;
          }
        }
      }
    } catch (e) {
      const err = e as Denied;
      const status = err.status ?? 0;
      console.error(`Source ${source} failed:`, err.message);
      if (status === 402 || status === 403 || status === 429) {
        pausedReason = `${source} returned ${status}: ${err.message}`.slice(0, 500);
      } else {
        errors.push(`${source}: ${err.message}`);
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

  // Drop events that are well past and therefore no longer useful.
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
