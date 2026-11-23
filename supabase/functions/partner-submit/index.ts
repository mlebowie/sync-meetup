import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * The partner submission page (/submit/<token>). Partners have no account: the
 * token in their link says who they are. Two actions:
 *   info   → the partner's name, to greet them
 *   submit → the events they filled in go to Waiting as SYNC partner events
 * Nothing is ever published from here: Emilie approves every event in /curate.
 */
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
  source_url: string | null;
  title: string;
  description: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue_name: string | null;
  location: string | null;
  price_label: string | null;
  english: string | null;
  recurrence: string;
  repeat_until: string | null;
  category: string;
  capacity: number | null;
  registration_url: string | null;
  women_only: boolean;
  lgbtq_friendly: boolean;
  pet_friendly: boolean;
}

const httpUrl = (v: unknown) => {
  const t = text(v, 500);
  return t && /^https?:\/\//i.test(t) ? t : null;
};

function cleanDraft(raw: Record<string, unknown>): Draft {
  return {
    source_url: httpUrl(raw.source_url),
    title: text(raw.title, 200) ?? '',
    description: text(raw.description, 3000),
    date: isDate(raw.date) ? raw.date : null,
    start_time: isTime(raw.start_time) ? raw.start_time : null,
    end_time: isTime(raw.end_time) ? raw.end_time : null,
    venue_name: text(raw.venue_name, 200),
    location: text(raw.location ?? raw.address, 300),
    price_label: text(raw.price_label ?? raw.price, 60),
    english: oneOf(raw.english, ENGLISH),
    recurrence: oneOf(raw.recurrence, REPEATS) ?? 'one-off',
    repeat_until: isDate(raw.repeat_until) ? raw.repeat_until : null,
    category: oneOf(raw.category, CATEGORIES) ?? 'Social networking',
    capacity: Number.isInteger(Number(raw.capacity)) && Number(raw.capacity) > 0 ? Math.min(Number(raw.capacity), 100000) : null,
    registration_url: httpUrl(raw.register_url ?? raw.registration_url),
    women_only: raw.women_only === true,
    lgbtq_friendly: raw.lgbtq_friendly === true,
    pet_friendly: raw.pet_friendly === true,
  };
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
      if (!d.title || !d.date || !d.start_time || !d.description || !d.venue_name || !d.price_label || !d.english) {
        problems.push(`${d.title || 'An event'}: needs a title, description, date, start time, venue, price and language`);
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
      if (!photo) notes.push('No photo');

      const { error } = await supabase.from('events').insert({
        source: 'partner',
        source_event_id: `submit:${partner.id}:${crypto.randomUUID()}`,
        source_url: d.source_url ?? d.registration_url ?? partner.register_url ?? null,
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
        price_label: d.price_label,
        capacity: d.capacity,
        recurrence: d.recurrence,
        repeat_until: d.recurrence !== 'one-off' ? d.repeat_until : null,
        women_only: d.women_only,
        lgbtq_friendly: d.lgbtq_friendly,
        pet_friendly: d.pet_friendly,
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
