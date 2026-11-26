// SYNC's automatic curator. Reviews Waiting events that are at least 24 hours
// away against their own pages, the way the SYNC Curator skill does, and
// publishes the ones that pass every check. Anything uncertain stays in
// Waiting with a "Needs review" note.
//
// It runs in test mode until Emilie switches it on: every decision is recorded
// in curator_decisions and no event is changed (see curator_settings).
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { CATEGORIES, decide, type PageFacts, type Review } from './rules.ts';

const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
const AI_API_URL = Deno.env.get('AI_API_URL') ?? 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const AI_API_KEY = Deno.env.get('AI_API_KEY');
// A stronger model can be set for curating alone.
const AI_MODEL = Deno.env.get('CURATOR_MODEL') ?? Deno.env.get('AI_MODEL') ?? 'gemini-3.5-flash-lite';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** One run stays well inside the 150 s edge limit. */
const STOP_STARTING_MS = 95_000;
// One at a time: the AI service limits requests per minute.
const PARALLEL = 1;
const MAX_PER_RUN = 12;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

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

// --- reading the event page -------------------------------------------------

function eventLd(html: string): Record<string, unknown> | null {
  const blocks = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  const events: Record<string, unknown>[] = [];
  for (const b of blocks) {
    try {
      const j = JSON.parse(b[1]);
      const list = Array.isArray(j) ? j : (j['@graph'] ?? [j]);
      for (const x of list) if (/Event/.test(String(x?.['@type']))) events.push(x);
    } catch {
      /* not JSON */
    }
  }
  // A page listing several events (a series or calendar) gives no single date.
  return events.length === 1 ? events[0] : null;
}

function textOf(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

async function readPage(url: string): Promise<{ facts: PageFacts; text: string }> {
  const facts: PageFacts = {
    reachable: false,
    startDate: null,
    endDate: null,
    eventStatus: null,
    availability: null,
    attendanceMode: null,
    image: null,
  };
  let text = '';
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept-Language': 'en' },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) {
      const html = await res.text();
      const ld = eventLd(html);
      if (ld) {
        const offers = Array.isArray(ld.offers) ? ld.offers : ld.offers ? [ld.offers] : [];
        const avail = offers.map((o: Record<string, unknown>) => String(o?.availability ?? '')).filter(Boolean);
        facts.startDate = typeof ld.startDate === 'string' ? ld.startDate : null;
        facts.endDate = typeof ld.endDate === 'string' ? ld.endDate : null;
        facts.eventStatus = typeof ld.eventStatus === 'string' ? ld.eventStatus : null;
        facts.attendanceMode = typeof ld.eventAttendanceMode === 'string' ? ld.eventAttendanceMode : null;
        // Full only when every offer is sold out.
        facts.availability = avail.length && avail.every((a) => /SoldOut/i.test(a)) ? 'SoldOut' : null;
        const img = Array.isArray(ld.image) ? ld.image[0] : ld.image;
        if (typeof img === 'string') facts.image = img;
      }
      const og = /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i.exec(html)?.[1] ??
        /<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i.exec(html)?.[1];
      if (og) facts.image = og.replace(/&amp;/g, '&');
      text = textOf(html);
      facts.reachable = text.length > 300;
    }
  } catch (err) {
    console.error(`Direct read failed for ${url}: ${err}`);
  }
  // Pages that build themselves in the browser: read them through Firecrawl.
  if ((!facts.reachable || text.length < 800) && FIRECRAWL_API_KEY) {
    try {
      const res = await fetch('https://api.firecrawl.dev/v2/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${FIRECRAWL_API_KEY}` },
        body: JSON.stringify({ url, onlyMainContent: true, waitFor: 2000, timeout: 30_000, formats: ['markdown'] }),
        signal: AbortSignal.timeout(35_000),
      });
      if (res.ok) {
        const data = await res.json();
        const md: string = data?.data?.markdown ?? data?.markdown ?? '';
        if (md.length > text.length) text = md;
        facts.reachable = text.length > 300;
      }
    } catch (err) {
      console.error(`Firecrawl read failed for ${url}: ${err}`);
    }
  }
  text = text.slice(0, 12_000);
  facts.text = text;
  return { facts, text };
}

// --- the AI review ------------------------------------------------------------

const RULES = `You review one event for SYNC, an app for newcomers, expats and locals in Porto, Portugal.
The event page is the truth; the stored row is a draft from a collector. Use only facts from the page.

Return JSON with these keys:
- decision: "publish" (everything checks out), "waitlist" (checks out but nobody can register: every ticket sold out, full, or waitlist only), "hide" (cancelled, already happened, online-only, outside Greater Porto, or clearly not for SYNC: a sales pitch, a multi-day course with compulsory attendance), or "review" (anything you are unsure of, or the page contradicts itself).
- reason: under 100 characters, why (required for hide and review).
- hide_kind: for hide only: "cancelled", "past", "online", "outside_porto" or "not_a_fit".
- description: plain text, 40 to 300 words, in English (translate Portuguese). What actually happens, format and rough schedule, who it is for and the level, the language, what to bring, anything that makes it easy or hard for a newcomer. Concrete, no marketing filler, emojis or hashtags. Never add details the page does not give. If any ticket costs money, say plainly that it is a paid event, the price(s), and where to buy (for example "Tickets are sold on Eventbrite; use the link on this card."). If the page says it repeats, end with one line such as "Repeats every Monday.".
- If published descriptions from this organiser are given and one covers the same event, start from that wording and change only what this date's page changes.
- price_label: "Free", "€15", or "From €11.89" for several tiers (the lowest). null if the page does not say. Never invent a price.
- is_paid: true if any ticket costs money, false if free, null if the page does not say.
- title: if the stored title is longer than 10 words or carries numbering, emojis, the venue, the organiser's name, ticket words or a repeated "Porto", a shorter title of at most 10 words that keeps the event's own name; otherwise null.
- organizer_name: who organises or hosts the event, exactly as the page names them (the group, venue or person), or null if the page does not say.
- organizer_bio: 1 to 3 factual sentences from the page's about-the-organiser text, or null.
- image_url: the event's own image (https), or null if only a logo or placeholder.
- category: exactly one of: ${CATEGORIES.join(', ')}. The activity decides, not the setting (a photo walk or book club is Arts & culture; a run club is Sports; a club night or DJ set is Music & live events; dance classes and socials are Dance; business networking is Professional development, tech networking is Tech & AI, make-friends socials are Social networking; workshops go where their subject is).
- category_unclear: true if two labels fit equally.
- start_local and end_local: Porto wall-clock times "YYYY-MM-DDTHH:MM" from the page (a time with no zone is Porto time); end_local null if not given.
- recurrence: "one-off", "weekly", "biweekly" or "monthly", from what the page says.
Reply with JSON only.`;

async function reviewEvent(
  row: Record<string, unknown>,
  page: { facts: PageFacts; text: string },
  templates: { title: string; description: string }[],
): Promise<Review> {
  const user =
    `Today: ${new Date().toISOString().slice(0, 10)} (Porto).\n\n` +
    `Stored row:\n${JSON.stringify({
      title: row.title,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      price_label: row.price_label,
      organizer_name: row.organizer_name,
      category: row.category,
      description: row.description,
      review_note: row.review_note,
    })}\n\n` +
    `Structured data on the page: ${JSON.stringify({ ...page.facts, text: undefined })}\n\n` +
    (templates.length
      ? `Published descriptions from this organiser:\n${templates
          .map((t, i) => `${i + 1}. "${t.title}": ${t.description}`)
          .join('\n')}\n\n`
      : '') +
    `Event page (${row.source_url}):\n${page.text}`;
  const request = {
    model: AI_MODEL,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: RULES },
      { role: 'user', content: user },
    ],
  };
  const call = (payload: Record<string, unknown>) =>
    fetch(AI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AI_API_KEY}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60_000),
    });
  let res = await call(request);
  // Busy or over the per-minute limit: wait and try twice more.
  for (const wait of [15_000, 30_000]) {
    if (res.status !== 429 && res.status !== 503) break;
    await new Promise((r) => setTimeout(r, wait));
    res = await call(request);
  }
  if (res.status === 400) {
    const { response_format: _ignored, ...plain } = request;
    res = await call(plain);
  }
  if (!res.ok) throw new Error(`AI review failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const content: string = (await res.json())?.choices?.[0]?.message?.content ?? '';
  return JSON.parse(content.replace(/```json|```/g, '').trim()) as Review;
}

// --- the run --------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!AI_API_KEY) return json({ error: 'Curator is not configured' }, 500);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  let allowed = token !== '' && (token === SERVICE_ROLE || (await isServiceKey(token)));
  if (!allowed && token) {
    const { data: userData } = await supabase.auth.getUser(token);
    if (userData.user) {
      const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userData.user.id, _role: 'admin' });
      allowed = isAdmin === true;
    }
  }
  if (!allowed) return json({ error: 'Admins only' }, 403);

  const body = await req.json().catch(() => ({}));
  const { data: settings } = await supabase.from('curator_settings').select('mode').eq('id', 1).maybeSingle();
  // Live only when switched on in curator_settings; a request can force a test.
  const live = settings?.mode === 'live' && body?.test !== true;
  // Test runs may look at events already checked (to try again after a fix).
  const recheck = body?.recheck === true;
  const limit = Math.min(Number(body?.limit) || MAX_PER_RUN, 25);

  const started = Date.now();
  const runId = crypto.randomUUID();
  let query = supabase
    .from('events')
    .select('*')
    .eq('review_status', 'pending')
    .gte('starts_at', new Date(Date.now() + 24 * 3600_000).toISOString())
    .order('starts_at', { ascending: true })
    .limit(limit);
  if (!recheck) query = query.is('auto_checked_at', null);
  const { data: rows, error } = await query;
  if (error) return json({ error: error.message }, 500);

  const results: Record<string, unknown>[] = [];
  const queue = [...(rows ?? [])];

  async function handle(row: Record<string, unknown>) {
    const id = row.id as string;
    try {
      const page = await readPage(String(row.source_url));
      const { data: templates } = await supabase
        .from('event_templates')
        .select('title,description')
        .eq('organizer_key', String(row.organizer_name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim())
        .order('updated_at', { ascending: false })
        .limit(3);
      const review = await reviewEvent(row, page, templates ?? []);
      const outcome = decide(review, page.facts, {
        title: String(row.title ?? ''),
        organizer_name: (row.organizer_name as string) ?? null,
        starts_at: String(row.starts_at),
        ends_at: (row.ends_at as string) ?? null,
        image_url: (row.image_url as string) ?? null,
        tags: (row.tags as string[]) ?? [],
        category: (row.category as string) ?? null,
      });

      const now = new Date().toISOString();
      const update: Record<string, unknown> =
        outcome.action === 'hide'
          ? { review_status: 'rejected', reviewed_at: now, review_note: outcome.note }
          : outcome.action === 'flag'
            ? { ...outcome.patch, review_note: outcome.note }
            : { ...outcome.patch, review_status: 'approved', reviewed_at: now, review_note: null, auto_published_at: now };

      await supabase.from('curator_decisions').insert({
        run_id: runId,
        event_id: id,
        live,
        action: outcome.action,
        note: outcome.note,
        title: row.title,
        source_url: row.source_url,
        before: {
          description: row.description,
          price_label: row.price_label,
          category: row.category,
          starts_at: row.starts_at,
          time_label: row.time_label,
          image_url: row.image_url,
          tags: row.tags,
        },
        after: update,
        ai_review: review,
        page_facts: { ...page.facts, text: undefined },
      });
      if (live) {
        const { error: upErr } = await supabase
          .from('events')
          .update({ ...update, auto_checked_at: now, updated_at: now })
          .eq('id', id)
          .eq('review_status', 'pending'); // never touch an event Emilie has just reviewed
        if (upErr) throw upErr;
      }
      results.push({ id, title: row.title, action: outcome.action, note: outcome.note });
    } catch (err) {
      console.error(`Curator failed on ${id}: ${err}`);
      results.push({ id, title: row.title, action: 'error', note: String(err).slice(0, 200) });
      await supabase.from('curator_decisions').insert({
        run_id: runId,
        event_id: id,
        live,
        action: 'error',
        note: String(err).slice(0, 300),
        title: row.title,
        source_url: row.source_url,
      });
    }
  }

  const workers = Array.from({ length: PARALLEL }, async () => {
    while (queue.length && Date.now() - started < STOP_STARTING_MS) {
      await handle(queue.shift()!);
    }
  });
  await Promise.all(workers);

  const count = (a: string) => results.filter((r) => r.action === a).length;
  return json({
    run_id: runId,
    mode: live ? 'live' : 'test',
    checked: results.length,
    left: queue.length,
    publish: count('publish'),
    waitlist: count('waitlist'),
    hide: count('hide'),
    flag: count('flag'),
    error: count('error'),
    results,
  });
});
