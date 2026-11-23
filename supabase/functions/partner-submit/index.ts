import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * The partner submission page (/submit/<token>). Partners have no account: the
 * token in their link says who they are. Three actions:
 *   info   → the partner's name, to greet them
 *   draft  → pasted details (one event or a list) become editable drafts
 *   submit → the checked drafts go to Waiting as SYNC partner events
 * Nothing is ever published from here: Emilie approves every event in /curate.
 */
const AI_API_URL =
  Deno.env.get('AI_API_URL') ?? 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const AI_API_KEY = Deno.env.get('AI_API_KEY');
const AI_MODEL = Deno.env.get('AI_MODEL') ?? 'gemini-3.5-flash-lite';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** Abuse limits for a link that anyone holding it can use. */
const MAX_EVENTS_PER_SUBMIT = 15;
const MAX_EVENTS_PER_DAY = 40;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Must match the onboarding interests (src/lib/userProfile.ts). */
const CATEGORIES = [
  'Sports', 'Dance', 'Health & wellness', 'Spirituality', 'Religion', 'Outdoors activities', 'Social networking',
  'Cultural exchange', 'Languages', 'Professional development', 'Tech & AI', 'Music & live events',
  'Arts & culture', 'Dining & cooking', 'Education', 'Games', 'Charity & non-profit', 'Pop-up events',
];
const ENGLISH = ['yes', 'partly', 'no'];
const REPEATS = ['one-off', 'weekly', 'biweekly', 'monthly'];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const oneOf = (v: unknown, options: string[]) => (typeof v === 'string' && options.includes(v) ? v : null);
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isTime = (v: unknown): v is string => typeof v === 'string' && /^\d{2}:\d{2}$/.test(v);

/** Porto wall-clock date and time → ISO instant, honouring summer time. */
function lisbonToIso(date: string, time: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const asUtc = Date.UTC(y, m - 1, d, hh, mm);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Lisbon',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(asUtc));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const shown = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  return new Date(asUtc - (shown - asUtc)).toISOString();
}

interface Draft {
  title: string;
  description: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue_name: string | null;
  location: string | null;
  price_label: string | null;
  is_paid: boolean | null;
  english: string | null;
  recurrence: string;
  category: string;
  registration_url: string | null;
  women_only: boolean;
  image_url?: string | null;
}

function cleanDraft(raw: Record<string, unknown>): Draft {
  return {
    title: text(raw.title, 200) ?? '',
    description: text(raw.description, 3000),
    date: isDate(raw.date) ? raw.date : null,
    start_time: isTime(raw.start_time) ? raw.start_time : null,
    end_time: isTime(raw.end_time) ? raw.end_time : null,
    venue_name: text(raw.venue_name, 200),
    location: text(raw.location ?? raw.address, 300),
    price_label: text(raw.price_label ?? raw.price, 60),
    is_paid: typeof raw.is_paid === 'boolean' ? raw.is_paid : null,
    english: oneOf(raw.english, ENGLISH),
    recurrence: oneOf(raw.recurrence, REPEATS) ?? 'one-off',
    category: oneOf(raw.category, CATEGORIES) ?? 'Social networking',
    registration_url: text(raw.registration_url, 500),
    women_only: raw.women_only === true,
  };
}

async function draftEvents(pasted: string, partner: string, link: string | null): Promise<Draft[]> {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Lisbon' });
  const res = await fetch(AI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AI_API_KEY}` },
    signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({
      model: AI_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            `An organiser is sending their upcoming events to SYNC, an app that helps newcomers, expats and locals in Porto meet people. ` +
            `The text may describe one event or list several (a WhatsApp list, an Instagram caption, an email). Return one entry per event and per date. ` +
            `Today is ${today} (Europe/Lisbon). Resolve dates against today; with no year, use the next occurrence. ` +
            `Write each description in clear English (translate Portuguese), 2-5 sentences: what happens, who it is for, what is included. ` +
            `If it costs money, say so plainly with the price. No emojis or hashtags. Never invent facts: use null when something is not stated. ` +
            `Describe only what the text says: do not add what is included (materials, drinks), the level, who it suits or how long it lasts unless the text says so; a short description is better than an invented one.\n` +
            `Reply with JSON only: {"events":[{"title":string,"description":string,"date":"YYYY-MM-DD"|null,"start_time":"HH:MM"|null,` +
            `"end_time":"HH:MM"|null,"venue_name":string|null,"location":string|null (street address),"price_label":"Free"|"€20"|"From €10"|null,` +
            `"is_paid":boolean|null,"english":"yes"|"partly"|"no"|null (only from what the text says about the language it runs in),` +
            `"recurrence":"one-off"|"weekly"|"biweekly"|"monthly","category":one of ${JSON.stringify(CATEGORIES)},` +
            `"registration_url":string|null,"women_only":boolean}]}`,
        },
        { role: 'user', content: `Organiser: ${partner}\n${link ? `Link: ${link}\n` : ''}\n${pasted}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`The AI service returned ${res.status}`);
  const content: string = (await res.json())?.choices?.[0]?.message?.content ?? '';
  const parsed = JSON.parse(content.replace(/```json|```/g, '').trim());
  const list = Array.isArray(parsed?.events) ? parsed.events : Array.isArray(parsed) ? parsed : [parsed];
  return list
    .slice(0, MAX_EVENTS_PER_SUBMIT)
    .map((e: Record<string, unknown>) => {
      const d = cleanDraft(e);
      if (!d.registration_url && link) d.registration_url = link;
      return d;
    })
    .filter((d: Draft) => d.title);
}

/** Saves a photo the partner attached (data URL) to the public event-images bucket. */
async function savePhoto(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the untyped Deno client
  supabase: any,
  partnerId: string,
  dataUrl: string,
): Promise<string | null> {
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  if (bytes.length > MAX_IMAGE_BYTES) return null;
  const ext = m[1].split('/')[1].replace('jpeg', 'jpg');
  const path = `partners/${partnerId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('event-images').upload(path, bytes, { contentType: m[1] });
  if (error) {
    console.error(`partner-submit: photo upload failed: ${error.message}`);
    return null;
  }
  return supabase.storage.from('event-images').getPublicUrl(path).data.publicUrl;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!AI_API_KEY) return json({ error: 'This page is not set up yet' }, 500);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Send JSON' }, 400);
  }
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!/^[a-z0-9-]{6,60}$/.test(token)) return json({ error: 'This link is not valid' }, 404);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { data: partner } = await supabase
    .from('partner_organisers')
    .select('id,name,bio,register_url,whatsapp_url,submit_enabled')
    .eq('submit_token', token)
    .maybeSingle();
  if (!partner || !partner.submit_enabled) {
    return json({ error: 'This link is not active. Ask SYNC for a new one.' }, 404);
  }

  const action = body.action;
  if (action === 'info') return json({ partner: partner.name });

  if (action === 'draft') {
    const pasted = String(body.text ?? '').trim().slice(0, 10_000);
    if (pasted.length < 10) return json({ error: 'Paste your event details first' }, 400);
    try {
      const events = await draftEvents(pasted, partner.name, text(body.link, 500));
      if (!events.length) return json({ error: 'No events found in that text. Try adding a title and date.' }, 422);
      return json({ events });
    } catch (e) {
      console.error(`partner-submit draft failed: ${(e as Error).message}`);
      return json({ error: 'Could not read that text just now. Please try again.' }, 502);
    }
  }

  if (action === 'submit') {
    const incoming = Array.isArray(body.events) ? body.events.slice(0, MAX_EVENTS_PER_SUBMIT) : [];
    if (!incoming.length) return json({ error: 'No events to send' }, 400);

    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('submitted_by', partner.id)
      .gte('created_at', since);
    if ((count ?? 0) + incoming.length > MAX_EVENTS_PER_DAY) {
      return json({ error: 'That is more events than one day allows. Please send the rest tomorrow.' }, 429);
    }

    const saved: string[] = [];
    const problems: string[] = [];
    for (const raw of incoming as Record<string, unknown>[]) {
      const d = cleanDraft(raw);
      if (!d.title || !d.date || !d.start_time) {
        problems.push(`${d.title || 'An event'}: needs a title, date and start time`);
        continue;
      }
      const startsAt = lisbonToIso(d.date, d.start_time);
      if (new Date(startsAt).getTime() < Date.now()) {
        problems.push(`${d.title}: the date has already passed`);
        continue;
      }
      const photo = typeof raw.photo === 'string' ? await savePhoto(supabase, partner.id, raw.photo) : null;
      const notes = ['Sent by the partner; check before publishing'];
      if (d.english !== 'yes') notes.push(d.english === 'no' ? 'Not in English' : 'Check the language');
      if (d.is_paid && !d.price_label) notes.push('Paid, but no price given');
      if (!photo) notes.push('No photo');

      const { error } = await supabase.from('events').insert({
        source: 'partner',
        source_event_id: `submit:${partner.id}:${crypto.randomUUID()}`,
        source_url: d.registration_url ?? partner.register_url ?? null,
        register_url: d.registration_url ?? partner.register_url ?? null,
        whatsapp_url: partner.whatsapp_url,
        title: d.title,
        description: d.description,
        starts_at: startsAt,
        ends_at: d.end_time ? lisbonToIso(d.date, d.end_time) : null,
        time_label: d.end_time ? `${d.start_time}–${d.end_time}` : d.start_time,
        venue_name: d.venue_name,
        location: d.location ?? d.venue_name ?? 'Porto',
        image_url: photo,
        organizer_name: partner.name,
        organizer_bio: partner.bio,
        category: d.category,
        price_label: d.price_label ?? (d.is_paid === false ? 'Free' : null),
        recurrence: d.recurrence,
        women_only: d.women_only,
        tags: ['sync-partner'],
        classified: true,
        review_status: 'pending',
        review_note: notes.join(' · ').slice(0, 200),
        submitted_by: partner.id,
      });
      if (error) {
        console.error(`partner-submit insert failed: ${error.message}`);
        problems.push(`${d.title}: could not be saved`);
      } else {
        saved.push(d.title);
      }
    }
    return json({ saved, problems });
  }

  return json({ error: 'Unknown action' }, 400);
});
