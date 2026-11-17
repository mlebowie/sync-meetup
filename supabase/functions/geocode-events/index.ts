import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  type Coords,
  type NominatimResult,
  NORTH_PORTUGAL,
  acceptGeocode,
  geocodeQuery,
  isVagueLocation,
} from '../_shared/geo.ts';

/**
 * Fills in coordinates for events that have none, by looking up their address
 * with OpenStreetMap Nominatim. Runs after the daily collectors, and can be run
 * by hand (admin sign-in or the service role key) to fill in older events.
 *
 * Every event is tried once: geocoded_at records the attempt and geo_source the
 * outcome ('geocoded', 'vague' or 'not_found'). Clear geocoded_at on a row to
 * have it tried again, for instance after correcting its address.
 *
 * Nominatim's usage policy allows one request per second with an identifying
 * User-Agent; this job keeps to that and stops well inside the edge time limit.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
/** Optional contact address Nominatim asks heavy users to send. */
const NOMINATIM_EMAIL = Deno.env.get('NOMINATIM_EMAIL') ?? '';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'SYNC event map (https://github.com/mlebowie/sync-meetup)';
const DEFAULT_LIMIT = 60;
const STOP_MS = 110_000; // Supabase stops an edge function after 150s
const PAUSE_MS = 1_100; // Nominatim: at most one request per second

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class RateLimited extends Error {}

/** Same check as scrape-events: only a service (secret) key may list users. */
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

async function lookup(q: string): Promise<Coords | null> {
  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'pt',
    viewbox: `${NORTH_PORTUGAL.minLng},${NORTH_PORTUGAL.maxLat},${NORTH_PORTUGAL.maxLng},${NORTH_PORTUGAL.minLat}`,
    bounded: '1',
  });
  if (NOMINATIM_EMAIL) params.set('email', NOMINATIM_EMAIL);
  const res = await fetch(`${NOMINATIM}?${params}`, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'pt,en' },
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 429 || res.status === 403) throw new RateLimited(`Nominatim returned ${res.status}`);
  if (!res.ok) return null;
  const results = (await res.json()) as NominatimResult[];
  return acceptGeocode(results[0]);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const started = Date.now();
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
  if (!allowed) return json({ error: 'Admins only' }, 403);

  let limit = DEFAULT_LIMIT;
  try {
    const body = await req.json();
    if (Number.isInteger(body?.limit) && body.limit > 0) limit = Math.min(body.limit, 200);
  } catch {
    // no body — default batch
  }

  // Newest first, so upcoming events get their pins before past ones.
  const { data: todo, error } = await supabase
    .from('events')
    .select('id, location, venue_name')
    .is('lat', null)
    .is('geocoded_at', null)
    .neq('review_status', 'rejected')
    .order('starts_at', { ascending: false })
    .limit(limit);
  if (error) return json({ error: error.message }, 500);

  // Venues repeat (weekly meetups, the same bars): reuse points already known.
  const known = new Map<string, Coords>();
  const { data: placed } = await supabase.from('events').select('location, lat, lng').not('lat', 'is', null).limit(2000);
  for (const r of placed ?? []) {
    if (r.location && r.lat != null && r.lng != null) known.set(geocodeQuery(r.location), { lat: r.lat, lng: r.lng });
  }

  const counts = { geocoded: 0, reused: 0, vague: 0, not_found: 0, remaining: 0 };
  let stopped: string | null = null;

  const save = async (id: string, outcome: 'geocoded' | 'vague' | 'not_found', c: Coords | null) => {
    const { error: e } = await supabase
      .from('events')
      .update({
        ...(c ? { lat: c.lat, lng: c.lng } : {}),
        geo_source: outcome,
        geocoded_at: new Date().toISOString(),
      })
      .eq('id', id)
      .is('lat', null);
    if (e) console.error(`Could not save coordinates for ${id}: ${e.message}`);
  };

  for (const row of todo ?? []) {
    if (Date.now() - started > STOP_MS) {
      stopped = 'time limit';
      break;
    }
    const location = String(row.location ?? '');
    if (isVagueLocation(location)) {
      await save(row.id, 'vague', null);
      counts.vague += 1;
      continue;
    }
    const q = geocodeQuery(location);
    const cached = known.get(q);
    if (cached) {
      await save(row.id, 'geocoded', cached);
      counts.reused += 1;
      continue;
    }
    try {
      let found = await lookup(q);
      await sleep(PAUSE_MS);
      // Addresses scraped from cards are sometimes only a venue name with extras;
      // the venue name and town on their own often resolve when the full text does not.
      const venue = String(row.venue_name ?? '').split('|')[0].split(' - ')[0].trim();
      if (!found && venue && !isVagueLocation(venue)) {
        found = await lookup(`${venue}, Porto, Portugal`);
        await sleep(PAUSE_MS);
      }
      if (found) {
        known.set(q, found);
        await save(row.id, 'geocoded', found);
        counts.geocoded += 1;
      } else {
        await save(row.id, 'not_found', null);
        counts.not_found += 1;
      }
    } catch (e) {
      // A refusal from Nominatim: stop now and leave the rest for the next run.
      if (e instanceof RateLimited) {
        stopped = e.message;
        break;
      }
      // A timeout or network error: leave this event untried for the next run.
      console.error(`Lookup failed for ${row.id}: ${e}`);
      await sleep(PAUSE_MS);
    }
  }

  const { count } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .is('lat', null)
    .is('geocoded_at', null)
    .neq('review_status', 'rejected');
  counts.remaining = count ?? 0;

  return json({ ok: true, ...counts, stopped });
});
