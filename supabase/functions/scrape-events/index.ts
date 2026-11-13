import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const FIRECRAWL_API = 'https://api.firecrawl.dev/v2';

const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
/** Any OpenAI-compatible chat completions endpoint. Defaults to Google Gemini. */
const AI_API_URL = Deno.env.get('AI_API_URL') ?? 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const AI_API_KEY = Deno.env.get('AI_API_KEY');
const AI_MODEL = Deno.env.get('AI_MODEL') ?? 'gemini-3.5-flash-lite';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** Safety limits — one run never does more than this. */
const MAX_EVENTS_PER_PAGE = 30;
const MAX_PAGES_PER_SOURCE = 2;
/** Per-source page budget; Lu.ma needs more pages because each calendar is small. */
const MAX_PAGES: Record<'eventbrite' | 'meetup' | 'luma' | 'agenda-porto' | 'porto-coffee-week', number> = {
  eventbrite: 5,
  meetup: 6,
  luma: 8,
  'agenda-porto': 9,
  'porto-coffee-week': 3,
};
const MAX_CLASSIFY_PER_RUN = 40;
/** A run can never outlive the edge time limit (150s), so a short lease is enough. */
const LEASE_MINUTES = 3;
/**
 * Time budget per run, measured from the start of the request. Supabase stops an
 * edge function after 150 seconds, so every step must finish comfortably before.
 */
const RUN_STARTED = { at: 0 };
const elapsed = () => Date.now() - RUN_STARTED.at;
const STOP_NEW_PAGES_MS = 45_000; // no new listing page is opened after this
const STOP_VERIFY_MS = 80_000; // per-event date checks are skipped after this
const STOP_EVENTS_MS = 125_000; // no further events are saved after this (saving is quick)
const STOP_LABELS_MS = 105_000; // AI labelling only starts before this

type SourceId = 'eventbrite' | 'meetup' | 'luma' | 'agenda-porto' | 'porto-coffee-week';

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
  // Porto Coffee Week's English festival agenda (workshops, championships, market).
  'porto-coffee-week': [
    'https://portocoffeeweek.pt/en/coffee-events-porto/',
    'https://portocoffeeweek.pt/en/coffee-market/',
    'https://3cket.com/en/event/porto-coffee-week',
  ],
};

/**
 * Themed runs: each focus has its own short page list so a single run stays
 * inside the edge time limit. Called with { sources: [...], focus: '...' }.
 */
type Focus = 'general' | 'sports' | 'languages' | 'outdoors';
const FOCUSES: Focus[] = ['general', 'sports', 'languages', 'outdoors'];

const THEMED_PAGES: Record<Exclude<Focus, 'general'>, Partial<Record<SourceId, string[]>>> = {
  // Racket sports first, then other team and court sports.
  sports: {
    meetup: [
      'https://www.meetup.com/find/?location=pt--Porto&source=EVENTS&keywords=padel&distance=twentyFiveMiles',
      'https://www.meetup.com/find/?location=pt--Porto&source=EVENTS&keywords=tennis&distance=twentyFiveMiles',
      'https://www.meetup.com/find/?location=pt--Porto&source=EVENTS&keywords=pickleball&distance=twentyFiveMiles',
      'https://www.meetup.com/find/?location=pt--Porto&source=EVENTS&keywords=salsa%20bachata%20kizomba%20dance&distance=twentyFiveMiles',
      'https://www.meetup.com/find/?location=pt--Porto&source=EVENTS&keywords=football%20volleyball%20basketball&distance=twentyFiveMiles',
    ],
    eventbrite: [
      'https://www.eventbrite.com/d/portugal--porto/padel/',
      'https://www.eventbrite.com/d/portugal--porto/tennis/',
      'https://www.eventbrite.com/d/portugal--porto/pickleball/',
      'https://www.eventbrite.com/d/portugal--porto/dance/',
    ],
  },
  languages: {
    meetup: [
      'https://www.meetup.com/find/?location=pt--Porto&source=EVENTS&keywords=language%20exchange&distance=tenMiles',
      'https://www.meetup.com/find/?location=pt--Porto&source=EVENTS&keywords=portuguese%20conversation&distance=tenMiles',
      'https://www.meetup.com/find/?location=pt--Porto&source=EVENTS&keywords=language%20cafe%20tandem&distance=tenMiles',
    ],
    eventbrite: [
      'https://www.eventbrite.com/d/portugal--porto/language-exchange/',
      'https://www.eventbrite.com/d/portugal--porto/language/',
    ],
  },
  // Guided walks in Porto and short trips from Porto to nearby towns.
  outdoors: {
    meetup: [
      'https://www.meetup.com/find/?location=pt--Porto&source=EVENTS&keywords=guided%20walk%20walking%20tour&distance=twentyFiveMiles',
      'https://www.meetup.com/find/?location=pt--Porto&source=EVENTS&keywords=day%20trip&distance=fiftyMiles',
      'https://www.meetup.com/find/?location=pt--Porto&source=EVENTS&keywords=hiking&distance=fiftyMiles',
    ],
    eventbrite: [
      'https://www.eventbrite.com/d/portugal--porto/walking-tour/',
      'https://www.eventbrite.com/d/portugal--porto/day-trip/',
      'https://www.eventbrite.com/d/portugal--porto/hiking/',
    ],
  },
};

/** Lu.ma has no city search, so each focus discovers calendars and events by web search. */
const LUMA_QUERIES: Record<Focus, string[]> = {
  general: [
    'site:lu.ma Porto Portugal events calendar',
    'site:lu.ma Porto yoga wellness OR fitness OR run event',
  ],
  sports: [
    'site:luma.com OR site:lu.ma Porto padel OR tennis OR pickleball',
    'site:luma.com OR site:lu.ma Porto salsa OR bachata OR kizomba OR "dance social"',
  ],
  languages: ['site:luma.com OR site:lu.ma Porto "language exchange" OR "language cafe" OR tandem'],
  outdoors: ['site:luma.com OR site:lu.ma Porto "walking tour" OR "guided walk" OR "day trip" OR hike'],
};

/**
 * Municipalities of Greater Porto, where everyday events count as local. Events
 * elsewhere are kept only when they are trips that leave from Porto.
 */
const GREATER_PORTO =
  /\b(porto|oporto|vila nova de gaia|gaia|matosinhos|le[cç]a|maia|gondomar|valongo|ermesinde|p[oó]voa de varzim|vila do conde|espinho|trofa|santo tirso|paredes|foz do douro)\b/i;
const OTHER_CITIES =
  /\b(lisbo[an]|lisbon|cascais|sintra|oeiras|almada|set[uú]bal|ericeira|coimbra|faro|lagos|algarve|madeira|funchal|a[cç]ores|azores|madrid|barcelona|london|berlin|paris)\b/i;
const ONLINE = /\b(online|virtual|zoom|google meet|webinar|livestream|live stream|remote)\b/i;

/** Keeps in-person events in Greater Porto, plus trips that depart from Porto. */
function locationOk(raw: RawEvent): boolean {
  const place = `${raw.venue ?? ''} ${raw.address ?? ''} ${raw.city ?? ''}`;
  if (raw.is_online === true || ONLINE.test(place)) return false;
  if (raw.is_trip_from_porto === true) return true;
  const city = raw.city?.trim() ?? '';
  if (city) return GREATER_PORTO.test(city);
  return !OTHER_CITIES.test(`${place} ${raw.title ?? ''}`);
}

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
          source_title: { type: 'string' },
          source_description: { type: 'string' },
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
          city: { type: 'string' },
          is_online: { type: 'boolean' },
          is_trip_from_porto: { type: 'boolean' },
          event_language: { type: 'string' },
          english_eligible: { type: 'boolean' },
          language_evidence: { type: 'string' },
        },
        required: [
          'title',
          'description',
          'source_title',
          'source_description',
          'url',
          'city',
          'is_online',
          'is_trip_from_porto',
          'event_language',
          'english_eligible',
          'language_evidence',
        ],
      },
    },
  },
  required: ['events'],
};

interface RawEvent {
  title?: string;
  description?: string;
  source_title?: string;
  source_description?: string;
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
  city?: string;
  is_online?: boolean;
  is_trip_from_porto?: boolean;
  event_language?: string;
  english_eligible?: boolean;
  language_evidence?: string;
}

class Denied extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function fcHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
  };
}

async function firecrawl(path: string, body: unknown) {
  const res = await fetch(`${FIRECRAWL_API}${path}`, {
    method: 'POST',
    headers: fcHeaders(),
    body: JSON.stringify(body),
    // A slow page must not push the run past the edge time limit.
    signal: AbortSignal.timeout(35_000),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Firecrawl ${path} failed [${res.status}]: ${text}`);
    throw new Denied(res.status, `Firecrawl ${path} failed: ${text.slice(0, 300)}`);
  }
  return await res.json();
}

/** What to pull out of a listing page; shared by every source. */
function listingPrompt(today: string): string {
  return (
    `Today is ${today}. Extract every upcoming event listed on this page that happens in person in Greater Porto, Portugal ` +
          '(Porto, Vila Nova de Gaia, Matosinhos, Maia, Gondomar, Valongo, Póvoa de Varzim, Vila do Conde, Espinho), ' +
          'or that is a trip or excursion departing from Porto to a nearby town (for example Guimarães, Braga, Aveiro or the Douro Valley). ' +
          'Include events that are not in English. Skip events held in Lisbon or any other city, and skip online-only events. ' +
          'For each event give city (the town where it takes place, or where a trip departs), is_online (true for online-only or virtual events) ' +
          'and is_trip_from_porto (true only for trips or excursions that leave from Porto). ' +
          'For each event determine the language in which attendees will participate from explicit listing evidence. ' +
          'Set english_eligible=true only when the listing explicitly says the event is in English, supports English or is multilingual with English, ' +
          'or when no event language is stated and both the source title and description are already written in English. ' +
          'Set english_eligible=false for Portuguese-only or other non-English-only events. If the language is unstated and the source copy is not English, set it false. ' +
          'Return event_language and a short language_evidence quote or explanation. Never infer spoken language from the location, organizer or audience. ' +
          'Always return source_title and source_description exactly as written on the source before any translation. ' +
          'For eligible events, preserve existing English title and description verbatim. Only when explicit evidence confirms the event supports English, ' +
          'translate non-English title or description into natural English without summarizing, adding facts or changing proper names. ' +
          'For each event also give: title, absolute url, date_text exactly as displayed on the card, ' +
          'iso_date (YYYY-MM-DD resolved from date_text relative to today; when the card shows no year, pick the year in which ' +
          'the weekday shown falls on that date), ' +
          'time (HH:MM 24-hour), venue, address, image_url, organizer, category, price, attendees count, ' +
          'and a one or two sentence description. Skip navigation links, adverts and anything that is not an event, ' +
          'and skip any event the page marks as past, ended or cancelled.'
  );
}

/**
 * Shrinks a page's markdown before extraction: tracking parameters, inline
 * data images and repeated blank lines carry no event information, and large
 * pages (Meetup) are otherwise too slow to read in one go.
 */
function compactMarkdown(md: string): string {
  return md
    .replace(/\(data:[^)]*\)/g, '()')
    .replace(/(\]\((?:https?:\/\/[^)?\s]+))\?[^)\s]*/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .slice(0, 30_000);
}

/**
 * Reads one listing page. Firecrawl only fetches the page as text (fast); the
 * events are then extracted with the project's AI model, which is much quicker
 * than Firecrawl's own extraction and keeps each page well inside the time limit.
 */
async function scrapeListing(url: string): Promise<RawEvent[]> {
  const today = new Date().toISOString().slice(0, 10);
  const data = await firecrawl('/scrape', {
    url,
    onlyMainContent: true,
    waitFor: 3000,
    timeout: 30_000,
    formats: ['markdown'],
  });
  const markdown = compactMarkdown(data?.markdown ?? data?.data?.markdown ?? '');
  if (markdown.trim().length < 50) return [];

  const request = {
      model: AI_MODEL,
      // Extraction needs no deliberation; this keeps large pages (Meetup) fast.
      reasoning_effort: 'low',
      messages: [
        {
          role: 'system',
          content:
            listingPrompt(today) +
            ' Make every url absolute (the page address is given). Reply with JSON only, matching this JSON schema: ' +
            JSON.stringify(EVENT_SCHEMA),
        },
        { role: 'user', content: `Page: ${url}\n\n${markdown}` },
      ],
    };
  const call = (payload: Record<string, unknown>) =>
    fetch(AI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AI_API_KEY}` },
      signal: AbortSignal.timeout(55_000),
      body: JSON.stringify(payload),
    });
  let res = await call(request);
  // Some models do not accept reasoning_effort; ask again without it.
  if (res.status === 400) {
    const { reasoning_effort: _ignored, ...plain } = request;
    res = await call(plain);
  }
  if (!res.ok) {
    const text = (await res.text()).slice(0, 300);
    console.error(`Listing extraction failed [${res.status}]: ${text}`);
    throw new Denied(res.status === 429 ? 429 : 0, `AI extraction failed (${res.status}): ${text}`);
  }
  const payload = await res.json();
  const content: string = payload?.choices?.[0]?.message?.content ?? '';
  let json: { events?: unknown } = {};
  try {
    json = JSON.parse(content.replace(/```json|```/g, '').trim());
  } catch {
    console.error('Listing extraction returned non-JSON');
    return [];
  }
  const events = Array.isArray(json?.events) ? (json.events as RawEvent[]) : [];
  return events.slice(0, MAX_EVENTS_PER_PAGE);
}

// Only tokens that do not exist as ordinary English words. Words shared with
// English ("a", "e", "as", "do", "de", "em", "no", "os") are deliberately
// excluded so English listings are never mistaken for Portuguese.
const PORTUGUESE_COPY =
  /\b(?:não|são|também|você|nós|uma|umas|duas|das|dos|pelo|pela|isso|este|esta|estes|estas|aquele|aquela|sobre|entre|até|desde|onde|quando|porque|muito|mais|melhor|nosso|nossa|seu|sua|evento|eventos|inscrição|inscrições|gratuito|entrada|bilhete|bilhetes|horário|sábado|domingo|segunda|terça|quarta|quinta|sexta|janeiro|fevereiro|março|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|conferência|exposição|oficina|palestra|encontro|caminhada|crianças|português|portuguesa|cidade|rua|praça|igreja|museu)\b|[ãõçáéíóúâêôà]/gi;
const EXPLICIT_ENGLISH = /\b(?:in english|english[- ]speaking|language\s*:\s*english|event language\s*:\s*english|english (?:is )?(?:supported|available)|bilingual|multilingual)\b/i;

/** Portuguese unless clearly signalled: requires several distinctive markers. */
function looksPortuguese(text: string | undefined): boolean {
  const value = text?.trim();
  if (!value) return false;
  const matches = value.match(PORTUGUESE_COPY)?.length ?? 0;
  if (matches === 0) return false;
  const words = value.split(/\s+/).length;
  return matches >= 3 || matches / Math.max(words, 1) >= 0.15;
}

function isEnglishEligible(raw: RawEvent): boolean {
  if (raw.english_eligible !== true) return false;
  if (EXPLICIT_ENGLISH.test(`${raw.event_language ?? ''} ${raw.language_evidence ?? ''}`)) return true;
  // Keep unless the source copy itself is clearly Portuguese.
  return !looksPortuguese(raw.source_title) && !looksPortuguese(raw.source_description);
}

/**
 * Lu.ma has no Porto city index, so start from known Porto calendars and top up
 * with search discovery (tech, wellness, creative communities) until the budget
 * for the source is used.
 */
async function lumaPages(focus: Focus = 'general'): Promise<string[]> {
  const urls: string[] = focus === 'general' ? [...SOURCE_PAGES.luma] : [];
  const queries = LUMA_QUERIES[focus];

  for (const query of queries) {
    if (urls.length >= MAX_PAGES.luma) break;
    try {
      const data = await firecrawl('/search', { query, limit: 10 });
      const results: { url?: string }[] = data?.data?.web ?? data?.web ?? [];
      for (const r of results) {
        const url = r?.url;
        if (!url || !/(?:lu\.ma|luma\.com)\//.test(url)) continue;
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

/**
 * The same listing appears under several addresses (eventbrite.pt / .co.uk /
 * .com, luma.com / lu.ma); one canonical host keeps it a single event.
 */
function canonicalHost(host: string): string {
  const h = host.toLowerCase().replace(/^www\./, '');
  if (/^eventbrite\./.test(h)) return 'www.eventbrite.com';
  if (h === 'luma.com') return 'lu.ma';
  if (h === 'meetup.com') return 'www.meetup.com';
  return host.toLowerCase();
}

function sourceEventId(source: SourceId, raw: RawEvent): string | null {
  const url = raw.url?.trim();
  if (!url) return null;
  try {
    const u = new URL(url);
    return `${canonicalHost(u.host)}${u.pathname}`.replace(/\/$/, '').slice(0, 200);
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

/** Builds an instant from a Porto calendar date + wall clock, honouring DST. */
function lisbonInstant(dateLabel: string, clock: string): Date {
  // Guess with UTC, then correct by the zone's real offset on that instant.
  const guess = new Date(`${dateLabel}T${clock}:00Z`);
  if (isNaN(guess.getTime())) return guess;
  const asLisbon = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Lisbon',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(guess);
  const [gh, gm] = asLisbon.split(':').map(Number);
  const [th, tm] = clock.split(':').map(Number);
  let diffMin = (gh * 60 + gm) - (th * 60 + tm);
  if (diffMin > 720) diffMin -= 1440;
  if (diffMin < -720) diffMin += 1440;
  return new Date(guess.getTime() - diffMin * 60_000);
}

const WEEKDAY_WORDS: [RegExp, number][] = [
  [/\b(sun|sunday|dom|domingo)\b/, 0],
  [/\b(mon|monday|seg|segunda)\b/, 1],
  [/\b(tue|tues|tuesday|ter|ter[cç]a)\b/, 2],
  [/\b(wed|wednesday|qua|quarta)\b/, 3],
  [/\b(thu|thur|thurs|thursday|qui|quinta)\b/, 4],
  [/\b(fri|friday|sex|sexta)\b/, 5],
  [/\b(sat|saturday|s[aá]b|s[aá]bado)\b/, 6],
];

/** The weekday a listing card shows ("Sat 2 May", "sábado, 2 de maio"), if exactly one. */
function listedWeekday(raw: RawEvent): number | null {
  const text = (raw.date_text ?? '').toLowerCase();
  const hits = WEEKDAY_WORDS.filter(([re]) => re.test(text)).map(([, d]) => d);
  return hits.length === 1 ? hits[0] : null;
}

/**
 * Cards often show "Saturday 2 May" with no year, and the year gets guessed.
 * When the weekday shown does not fall on the guessed date, the adjacent year
 * where it does is the real one. Returns the checked date and whether the
 * weekday could confirm it.
 */
export function checkListedYear(raw: RawEvent): { iso: string | null; weekdayChecked: boolean } {
  const iso = (raw.iso_date ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return { iso: null, weekdayChecked: false };
  const want = listedWeekday(raw);
  if (want === null) return { iso, weekdayChecked: false };
  const dow = (y: number) => new Date(Date.UTC(y, Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)))).getUTCDay();
  const year = Number(iso.slice(0, 4));
  if (dow(year) === want) return { iso, weekdayChecked: true };
  for (const y of [year - 1, year + 1]) {
    if (dow(y) === want) return { iso: `${y}${iso.slice(4)}`, weekdayChecked: true };
  }
  return { iso, weekdayChecked: false };
}

function parseStart(raw: RawEvent): Date | null {
  const iso = checkListedYear(raw).iso;
  if (!iso) return null;
  const time = (raw.time ?? '').trim();
  const hhmm = /^(\d{1,2}):(\d{2})/.exec(time);
  const clock = hhmm ? `${hhmm[1].padStart(2, '0')}:${hhmm[2]}` : '19:00';
  const parsed = lisbonInstant(iso, clock);
  return withinWindow(parsed) ? parsed : null;
}


/**
 * Listing cards are read by an AI and their dates drift, so the event page's own
 * schema.org startDate is treated as the truth whenever it is unambiguous.
 */
async function verifiedStart(
  url: string,
): Promise<{ date: Date; dateOnly: boolean; past?: boolean } | null> {
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
    const value = distinct[0].trim();
    // "2026-09-11" carries no clock; "2026-09-11T21:00" does.
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const parsed = dateOnly ? lisbonInstant(value, '00:00') : new Date(value);
    if (isNaN(parsed.getTime())) return null;
    // The page is the truth: a date already gone means the event is over, even
    // if the listing card (often with no year) suggested a future date.
    const endOfDay = dateOnly ? parsed.getTime() + 86_400_000 : parsed.getTime() + 6 * 3600_000;
    if (endOfDay < Date.now()) return { date: parsed, dateOnly, past: true };
    if (!withinWindow(parsed)) return null;
    return { date: parsed, dateOnly };
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

/** Porto calendar date, used when only the day is trustworthy. */
function portoDateLabel(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(d);
}

/**
 * Some listings publish a date without any start time. Only in that case keep
 * the confirmed day and take the clock from the card, falling back to a
 * sensible evening slot. A genuine 00:00 start is left untouched.
 */
function withListedClock(verified: { date: Date; dateOnly: boolean }, raw: RawEvent): Date {
  if (!verified.dateOnly) return verified.date;
  const hhmm = /^(\d{1,2}):(\d{2})/.exec((raw.time ?? '').trim());
  const clock = hhmm ? `${hhmm[1].padStart(2, '0')}:${hhmm[2]}` : '19:00';
  const rebuilt = lisbonInstant(portoDateLabel(verified.date), clock);
  return isNaN(rebuilt.getTime()) ? verified.date : rebuilt;
}



/** Vibe = the social energy of the room, not physical effort. Anything unmatched is "social". */
const LIVELY = ['party', 'rave', 'club night', 'nightlife', 'dj', 'festival', 'karaoke', 'concert', 'live music', 'pub crawl', 'rooftop', 'dance', 'salsa', 'bachata', 'football', 'pickup', 'tournament', 'bootcamp'];
const CHILL = ['meditation', 'sound bath', 'breathwork', 'yoga', 'book', 'reading', 'film', 'cinema', 'screening', 'museum', 'gallery', 'exhibition', 'comedy', 'talk', 'lecture', 'conference', 'guided walk', 'walking tour', 'tasting', 'sketch', 'pottery'];

/** SYNC interest labels — must match the onboarding interests (src/lib/userProfile.ts); src/test/categories.test.ts checks this. */
const CATEGORY_RULES: [RegExp, string][] = [
  [/pop-?up/, 'Pop-up events'],
  [/chess|trivia|quiz|board game|boardgame|gaming|video game|poker|dungeons/, 'Games'],
  [/volunteer|charity|non-?profit|ngo|fundrais|beach clean|clean-?up/, 'Charity & non-profit'],
  [/language exchange|language meetup|language caf[eé]|languages|tandem|polyglot|conversation (?:club|practice|exchange)|portuguese (?:class|practice|conversation)|english class|speak portuguese|intercambio/, 'Languages'],
  [/church|faith|bible|christian|muslim|mosque|synagogue|religio/, 'Religion'],
  [/salsa|bachata|kizomba|zouk|forr[oó]|tango|swing danc|lindy|dance social|social danc|dance class|dance night|dance party|ecstatic dance|contact improv|5 ?rhythms|ballroom|flamenco|hip ?hop dance|k-?pop dance|line danc|ceilidh|\bdance\b|\bdancing\b/, 'Dance'],
  [/tennis|padel|pickleball|squash|badminton|table tennis|ping[- ]?pong|football|soccer|futsal|basketball|volleyball|beach volley|run club|running club|jogging|marathon|\b5k\b|\b10k\b|bouldering|climbing|surf|skate|swimming|cycling|bike ride|martial arts|jiu-?jitsu|boxing|muay thai|rugby|golf|\bsports?\b/, 'Sports'],
  [/yoga|pilates|barre|hyrox|crossfit|bootcamp|calisthenic|nutrition|gym|fitness|wellness|wellbeing|well-?being|ice bath|cold plunge|sauna|spa day/, 'Health & wellness'],
  [/meditation|mindful|spiritual|reiki|astrolog|sound bath|sound healing|kirtan|tarot|retiro|retreat|chakra|kundalini|cacao|shamanic|breathwork|cuddle party/, 'Spirituality'],
  // Book clubs and photo walks are about the hobby, not the walk or the crowd.
  [/book club|book ?swap|reading (?:group|club|circle)|silent reading|readers'? (?:club|meetup)|literary|writers'? (?:club|circle|group|meetup)|writing (?:club|circle|group)|photo ?walk|photography (?:walk|meetup|club|tour)|photowalk|street photography/, 'Arts & culture'],
  [/hike|hiking|trail|kayak|paddle ?board|nature walk|camping|outdoor|picnic|day trip|birdwatch|forest bathing|sunrise walk|sunset walk|caminhada|walking holiday|camino|guided walk|walking tour|walk(?:ing)? group|day trip|excursion|road trip|douro valley|guimar[aã]es|braga|aveiro|viana do castelo|ponte de lima|ger[eê]s|amarante|costa nova/, 'Outdoors activities'],
  [/ ai |artificial intelligence|machine learning|tech|developer|software|coding|data|cyber|security|blockchain|robotic/, 'Tech & AI'],
  [/concert|live music|dj |band|gig|vinyl|jazz/, 'Music & live events'],
  [/comedy|stand-?up|theatre|theater|improv|art |arts|gallery|exhibition|painting|photograph|writing|film|cinema|book club|poetry/, 'Arts & culture'],
  [/dinner|brunch|lunch|food|cooking|wine tasting|tasting|restaurant|supper|bbq|coffee/, 'Dining & cooking'],
  [/workshop|course|lecture|class|seminar|masterclass|talk|philosophy|learn/, 'Education'],
  [/founder|startup|entrepreneur|business|career|professional|conference|b2b|freelanc|coworking/, 'Professional development'],
  [/expat|nomad|international|cultur|heritage|museum|city tour/, 'Cultural exchange'],
];

/**
 * Agenda Porto publishes its own section name for every listing, which is a
 * stronger signal than keywords, so it is mapped straight onto SYNC labels.
 */
const AGENDA_SECTION_RULES: [RegExp, string][] = [
  [/sport|motion|corrida|running|walk|caminhada/, 'Sports'],
  [/ao fresco|out and about|open air|open-air|outdoor/, 'Outdoors activities'],
  [/music|clubbing|concert|dj|jazz|ópera|opera/, 'Music & live events'],
  [/game|jogo/, 'Games'],
  [/fair|feira|market|pop-?up|party|festa/, 'Pop-up events'],
  [/talk|lecture|conversa|conferenc/, 'Education'],
  [/art|exhibition|stage|theatre|theater|dance|circus|film|cinema|performance|literature|comedy/, 'Arts & culture'],
  [/famil|kids|criança/, 'Cultural exchange'],
];

function canonicalCategory(raw: RawEvent, source?: SourceId): string {
  if (source === 'agenda-porto') {
    const section = ` ${raw.category ?? ''} `.toLowerCase();
    for (const [re, label] of AGENDA_SECTION_RULES) if (re.test(section)) return label;
  }
  // The title is the strongest signal; only fall back to the blurb when the
  // title says nothing useful, so a stray word in a long description cannot
  // hijack the label.
  const title = ` ${raw.title ?? ''} ${raw.category ?? ''} `.toLowerCase();
  for (const [re, label] of CATEGORY_RULES) if (re.test(title)) return label;
  const blob = ` ${raw.title ?? ''} ${raw.description ?? ''} ${raw.category ?? ''} `.toLowerCase();
  for (const [re, label] of CATEGORY_RULES) if (re.test(blob)) return label;
  return 'Social networking';
}

/** Venue and address, always ending with the town (Porto unless stated otherwise). */
function portoLocation(raw: RawEvent): string {
  const city = raw.city?.trim() || 'Porto';
  // Venue and address often repeat each other ("Fonte dos Leões, Fonte dos Leões").
  const pieces: string[] = [];
  for (const piece of [raw.venue, raw.address]) {
    const t = piece?.trim();
    if (!t) continue;
    if (pieces.some((p) => p.toLowerCase().includes(t.toLowerCase()))) continue;
    for (let i = pieces.length - 1; i >= 0; i--) {
      if (t.toLowerCase().includes(pieces[i].toLowerCase())) pieces.splice(i, 1);
    }
    pieces.push(t);
  }
  const parts = pieces.join(', ');
  if (!parts) return `${city}, Portugal`;
  const withCity = parts.toLowerCase().includes(city.toLowerCase()) ? parts : `${parts}, ${city}`;
  return withCity.slice(0, 300);
}

/** Agenda Porto marks free entry on the listing itself. */
function agendaPrice(raw: RawEvent, source?: SourceId): string | null {
  if (source !== 'agenda-porto') return null;
  const text = `${raw.category ?? ''} ${raw.description ?? ''}`.toLowerCase();
  return /\bfree\b|entrada livre|gratuito/.test(text) ? 'Free' : null;
}

/** Agenda Porto's own accessibility tags, carried onto the SYNC flags. */
function agendaFlags(raw: RawEvent, source?: SourceId): Record<string, boolean> {
  if (source !== 'agenda-porto') return {};
  const text = `${raw.category ?? ''} ${raw.description ?? ''}`.toLowerCase();
  return /pets allowed|pet-?friendly|animais/.test(text) ? { pet_friendly: true } : {};
}

function keywordDerive(raw: RawEvent) {
  const text = `${raw.title ?? ''} ${raw.description ?? ''} ${raw.category ?? ''}`.toLowerCase();
  const lively = LIVELY.some((k) => text.includes(k));
  const chill = !lively && CHILL.some((k) => text.includes(k));
  const attendees = raw.attendees ?? 0;
  return {
    vibe: lively ? 'lively' : chill ? 'chill' : 'social',
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

  const res = await fetch(AI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AI_API_KEY}` },
    signal: AbortSignal.timeout(25_000),
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You label social events for a meet-people app. For each event return vibe and group_size (small|medium|large). ' +
            'Vibe is the social energy of the room, not physical effort: chill = relaxed, low-pressure, fine to attend alone and observe; ' +
            'social = built around conversation and mingling, still easygoing; lively = loud and high energy, crowds, music, momentum. ' +
            'Reply with JSON only: {"labels":[{"id":"...","vibe":"chill|social|lively","group_size":"..."}]}',
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
    if (['chill', 'social', 'lively'].includes(label.vibe)) patch.vibe = label.vibe;
    if (['small', 'medium', 'large'].includes(label.group_size)) patch.group_size = label.group_size;
    const { error } = await supabase.from('events').update(patch).eq('id', label.id);
    if (!error) updated++;
  }
  return updated;
}

/**
 * True when the token is a service (secret) key for this project. Supabase itself
 * checks it: only a service key may list users through the Auth admin API. This
 * accepts both legacy service_role JWTs and newer sb_secret_ keys, whichever form
 * the function's own SUPABASE_SERVICE_ROLE_KEY happens to be.
 */
async function isServiceKey(token: string): Promise<boolean> {
  if (!token.startsWith('eyJ') && !token.startsWith('sb_secret_')) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1`, {
      headers: { apikey: token, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (!AI_API_KEY || !FIRECRAWL_API_KEY) {
    return new Response(JSON.stringify({ error: 'Scraper is not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  // --- only admins (or the service role, e.g. a scheduled job) may run it ----
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  let allowed = token !== '' && (token === SERVICE_ROLE || (await isServiceKey(token)));
  if (!allowed && token) {
    const { data: userData } = await supabase.auth.getUser(token);
    if (userData.user) {
      const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userData.user.id, _role: 'admin' });
      allowed = isAdmin === true;
    }
  }
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Admins only' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

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
  let refreshExisting = false;
  let focus: Focus = 'general';
  try {
    const body = await req.json();
    if (Array.isArray(body?.sources)) requested = body.sources.map((s: unknown) => String(s));
    if (FOCUSES.includes(body?.focus)) focus = body.focus;
    refreshExisting = body?.refresh_existing === true;
  } catch {
    // no body — full run
  }
  const allSources: SourceId[] = ['eventbrite', 'meetup', 'luma', 'agenda-porto', 'porto-coffee-week'];
  const sourceIds: SourceId[] = paused
    ? ['eventbrite']
    : requested.length
      ? allSources.filter((s) => requested.includes(s))
      : allSources;

  RUN_STARTED.at = Date.now();

  // Runs cut off by the time limit in the past never recorded an outcome; mark
  // them so the run history stays honest.
  await supabase
    .from('event_scrape_runs')
    .update({
      status: 'failed',
      lease_until: null,
      finished_at: new Date().toISOString(),
      error_details: 'Stopped before finishing (edge function time limit)',
    })
    .eq('status', 'running')
    .lt('started_at', new Date(Date.now() - LEASE_MINUTES * 60_000).toISOString());

  // Events already stored with a future start need no re-verification, which is
  // the slow part of a run.
  const { data: knownRows } = await supabase
    .from('events')
    .select('source,source_event_id,review_status,title,starts_at')
    .gte('starts_at', new Date().toISOString());
  // One listing per title per day, even when it appears under different links.
  const dayKey = (title: string | undefined, isoDay: string | undefined) =>
    `${(title ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}|${isoDay ?? ''}`;
  const lisbonDay = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Europe/Lisbon' });
  const seenDays = new Map<string, string>(
    (knownRows ?? []).map((r: Record<string, unknown>) => [
      dayKey(String(r.title ?? ''), lisbonDay(String(r.starts_at))),
      `${r.source}:${r.source_event_id}`,
    ]),
  );
  const known = new Set(
    (knownRows ?? []).map((r: Record<string, unknown>) => `${r.source}:${r.source_event_id}`),
  );
  // Curation decisions must survive every later run: rejected listings are never
  // re-inserted, and reviewed listings keep the wording the curator approved.
  const rejected = new Set(
    (knownRows ?? [])
      .filter((r: Record<string, unknown>) => r.review_status === 'rejected')
      .map((r: Record<string, unknown>) => `${r.source}:${r.source_event_id}`),
  );
  const reviewed = new Set(
    (knownRows ?? [])
      .filter((r: Record<string, unknown>) => r.review_status !== 'pending')
      .map((r: Record<string, unknown>) => `${r.source}:${r.source_event_id}`),
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
  let excluded = 0;
  let pausedReason: string | null = null;

  for (const source of sourceIds) {
    if (pausedReason || elapsed() > STOP_NEW_PAGES_MS) break;
    counts[source] = 0;
    try {
      const budget = paused ? MAX_PAGES_PER_SOURCE : MAX_PAGES[source];
      const pages =
        source === 'luma'
          ? (await lumaPages(focus)).slice(0, budget)
          : focus === 'general'
            ? SOURCE_PAGES[source].slice(0, budget)
            : (THEMED_PAGES[focus][source] ?? []).slice(0, budget);

      for (const page of pages) {
        if (pausedReason || elapsed() > STOP_NEW_PAGES_MS) break;
        let raws: RawEvent[];
        try {
          raws = paused ? (await scrapeListing(page)).slice(0, 5) : await scrapeListing(page);
        } catch (e) {
          // Credit or permission problems stop the run; a single slow or broken
          // page is only noted, and the next page is tried.
          const status = (e as Denied).status ?? 0;
          if (status === 402 || status === 403 || status === 429) throw e;
          errors.push(`${source}: ${page}: ${(e as Error).message}`.slice(0, 300));
          continue;
        }

        for (const raw of raws) {
          if (elapsed() > STOP_EVENTS_MS) break;
          const id = sourceEventId(source, raw);
          // Already stored and still upcoming: keep it and move on.
          if (!refreshExisting && id && known.has(`${source}:${id}`)) continue;
          if (!id) continue;
          // Lisbon, other cities and online-only events are not for SYNC Porto.
          if (!locationOk(raw)) continue;
          const sameDay = dayKey(raw.title, raw.iso_date);
          const twin = seenDays.get(sameDay);
          if (raw.iso_date && twin && twin !== `${source}:${id}`) continue;
          seenDays.set(sameDay, `${source}:${id}`);
          if (!isEnglishEligible(raw)) {
            if (known.has(`${source}:${id}`)) {
              const { error } = await supabase
                .from('events')
                .delete()
                .eq('source', source)
                .eq('source_event_id', id);
              if (error) errors.push(`${source}: could not exclude ${id}: ${error.message}`);
              else excluded += 1;
            }
            continue;
          }
          // A curator already decided on this listing: never resurrect a rejected
          // one, and never overwrite an approved one's edited wording.
          if (rejected.has(`${source}:${id}`)) continue;
          const listed = parseStart(raw);
          // Checking the event page's own date is the slow part; late in a run
          // the listing's date is used instead so the run can finish in time.
          const verified = raw.url && elapsed() < STOP_VERIFY_MS ? await verifiedStart(raw.url) : null;
          // The event's own page says it is over: never queue or refresh it.
          if (verified?.past) continue;
          const confirmed = verified ? withListedClock(verified, raw) : null;
          const starts = confirmed ?? listed;
          if (!raw.title || !starts) continue;
          // A far-off date that neither the event page nor the card's weekday
          // confirmed is the likeliest to carry a guessed year: ask the curator.
          const dateNote =
            !confirmed && !checkListedYear(raw).weekdayChecked && starts.getTime() > Date.now() + 120 * 86400_000
              ? 'Date not confirmed on the event page; check the year'
              : null;
          // A curator already decided on this listing: never overwrite the wording
          // they approved, but do keep schedule and practical details current so a
          // moved or repriced event does not stay stale in the feed.
          if (reviewed.has(`${source}:${id}`)) {
            const { error } = await supabase
              .from('events')
              .update({
                starts_at: starts.toISOString(),
                ends_at: null,
                time_label: confirmed
                  ? portoTimeLabel(confirmed)
                  : raw.time?.trim()?.slice(0, 20) || null,
                venue_name: raw.venue?.trim()?.slice(0, 200) || null,
                location: portoLocation(raw),
                image_url: raw.image_url?.startsWith('http') ? raw.image_url : null,
                organizer_name: raw.organizer?.trim()?.slice(0, 200) || null,
                price_label: raw.price?.trim()?.slice(0, 60) || agendaPrice(raw, source),
                attendee_count:
                  typeof raw.attendees === 'number' && raw.attendees > 0 ? Math.round(raw.attendees) : null,
                capacity:
                  typeof raw.attendees === 'number' && raw.attendees > 0
                    ? Math.max(12, Math.round(raw.attendees * 1.4))
                    : null,
                last_seen_at: new Date().toISOString(),
              })
              .eq('source', source)
              .eq('source_event_id', id);
            if (error) errors.push(`${source}: could not refresh ${id}: ${error.message}`);
            continue;
          }

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
            location: portoLocation(raw),
            image_url: raw.image_url?.startsWith('http') ? raw.image_url : null,
            organizer_name: raw.organizer?.trim()?.slice(0, 200) || null,
            category: canonicalCategory(raw, source),
            price_label: raw.price?.trim()?.slice(0, 60) || agendaPrice(raw, source),
            attendee_count:
              typeof raw.attendees === 'number' && raw.attendees > 0 ? Math.round(raw.attendees) : null,
            capacity:
              typeof raw.attendees === 'number' && raw.attendees > 0
                ? Math.max(12, Math.round(raw.attendees * 1.4))
                : null,
            // A known event keeps its repeat settings (the curator may have set them).
            ...(known.has(`${source}:${id}`) ? {} : { recurrence, series_key }),
            ...(dateNote ? { review_note: dateNote } : {}),
            ...keywordDerive(raw),
            ...agendaFlags(raw, source),
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
  if (!pausedReason && elapsed() < STOP_LABELS_MS) {
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
    JSON.stringify({ ok: !pausedReason, counts, upserted, excluded, classified, paused: pausedReason, errors }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
