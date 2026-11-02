import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * Turns pasted partner text (an Instagram caption, WhatsApp message, email…)
 * into a draft event. It never writes to the database: the curator reviews the
 * draft on /curate and saves it to the review queue herself.
 *
 * Uses the same AI settings as scrape-events, so no extra secrets are needed.
 */
const AI_API_URL =
  Deno.env.get('AI_API_URL') ?? 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const AI_API_KEY = Deno.env.get('AI_API_KEY');
const AI_MODEL = Deno.env.get('AI_MODEL') ?? 'gemini-3.5-flash-lite';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CATEGORIES = [
  'Sports', 'Health & fitness', 'Spirituality', 'Outdoors activities', 'Social networking',
  'Cultural exchange', 'Languages', 'Professional development', 'Tech & AI', 'Music & live events',
  'Arts & theatre', 'Dining & cooking', 'Education', 'Games', 'Charity & non-profit', 'Pop-up events',
];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const oneOf = (v: unknown, options: string[]) => (typeof v === 'string' && options.includes(v) ? v : null);
const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!AI_API_KEY) return json({ error: 'AI_API_KEY is not set for this project' }, 500);

  // Admins only.
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: userData } = token ? await supabase.auth.getUser(token) : { data: { user: null } };
  const { data: isAdmin } = userData.user
    ? await supabase.rpc('has_role', { _user_id: userData.user.id, _role: 'admin' })
    : { data: false };
  if (isAdmin !== true) return json({ error: 'Admins only' }, 403);

  let body: { text?: string; url?: string; organizer?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Send JSON with a "text" field' }, 400);
  }
  const pasted = String(body.text ?? '').trim().slice(0, 8000);
  if (pasted.length < 10) return json({ error: 'Paste the event details first' }, 400);

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Lisbon' });

  const res = await fetch(AI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AI_API_KEY}` },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content:
            `You extract one event for SYNC, an app that helps newcomers, expats and locals in Porto meet people. ` +
            `Today is ${today} (Europe/Lisbon). Resolve relative dates ("this Saturday") against today; ` +
            `if no year is given, use the next occurrence. Write the description in clear English (translate if needed), ` +
            `2-4 sentences, no emojis or hashtags. Never invent facts: use null when something is not stated.\n` +
            `Reply with JSON only:\n` +
            `{"title":string,"description":string,"date":"YYYY-MM-DD"|null,"start_time":"HH:MM"|null,"end_time":"HH:MM"|null,` +
            `"venue_name":string|null,"address":string|null,"price":string|null,"is_free":boolean|null,` +
            `"category":one of ${JSON.stringify(CATEGORIES)},"activity_level":"low"|"moderate"|"high",` +
            `"intensity":"chill"|"social"|"energetic","group_size":"small"|"medium"|"large",` +
            `"women_only":boolean,"language":string|null,"registration_url":string|null,"warnings":string[]}\n` +
            `Use "warnings" for anything the curator should double-check (missing date, ambiguous time, not in Porto, not in English).`,
        },
        {
          role: 'user',
          content:
            (body.organizer ? `Partner: ${body.organizer}\n` : '') +
            (body.url ? `Registration link: ${body.url}\n` : '') +
            `\n${pasted}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    console.error(`parse-event AI call failed [${res.status}]: ${detail}`);
    return json({ error: `The AI service returned ${res.status}` }, 502);
  }

  const payload = await res.json();
  const content: string = payload?.choices?.[0]?.message?.content ?? '';
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(content.replace(/```json|```/g, '').trim());
  } catch {
    return json({ error: 'Could not read the AI reply, try trimming the pasted text' }, 502);
  }

  const date = typeof raw.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : null;
  const startTime =
    typeof raw.start_time === 'string' && /^\d{2}:\d{2}$/.test(raw.start_time) ? raw.start_time : null;
  const endTime = typeof raw.end_time === 'string' && /^\d{2}:\d{2}$/.test(raw.end_time) ? raw.end_time : null;
  const price = text(raw.price, 60) ?? (raw.is_free === true ? 'Free' : null);

  return json({
    draft: {
      title: text(raw.title, 200) ?? '',
      description: text(raw.description, 2000),
      date,
      start_time: startTime,
      end_time: endTime,
      venue_name: text(raw.venue_name, 200),
      location: text(raw.address, 300),
      price_label: price,
      category: oneOf(raw.category, CATEGORIES) ?? 'Social networking',
      activity_level: oneOf(raw.activity_level, ['low', 'moderate', 'high']) ?? 'moderate',
      intensity: oneOf(raw.intensity, ['chill', 'social', 'energetic']) ?? 'social',
      group_size: oneOf(raw.group_size, ['small', 'medium', 'large']) ?? 'small',
      women_only: raw.women_only === true,
      language: text(raw.language, 40),
      registration_url: text(body.url, 500) ?? text(raw.registration_url, 500),
      warnings: Array.isArray(raw.warnings) ? raw.warnings.map(String).slice(0, 6) : [],
    },
  });
});
