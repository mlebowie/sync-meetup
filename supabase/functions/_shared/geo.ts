/**
 * Coordinates for SYNC events.
 *
 * Two sources, in order of trust:
 *   1. The event page's own data (schema.org "geo", or the platform's venue
 *      lat/lng), read from the page the scraper already fetches to confirm dates.
 *   2. An address lookup (OpenStreetMap Nominatim) for events whose page gives
 *      none: partner events, pasted events and late-run listings.
 *
 * A point is only kept when it is unambiguous and inside the North of Portugal.
 * Vague addresses ("Porto, Portugal") are never looked up: the answer would be
 * the city centre, which would show as a precise pin and skew neighbourhood counts.
 *
 * No imports, so the Deno edge functions and the Vitest suite share this file.
 */

export interface Coords {
  lat: number;
  lng: number;
}

/**
 * Generous box around Greater Porto and the day-trip towns the scraper keeps
 * (Espinho, Esmoriz, Póvoa de Varzim, Guimarães, Braga). Anything outside is a
 * wrong match (another Porto, or a page carrying the organiser's head office).
 */
export const NORTH_PORTUGAL = { minLat: 40.8, maxLat: 41.75, minLng: -8.95, maxLng: -8.0 };

export function inRegion(c: Coords): boolean {
  return (
    Number.isFinite(c.lat) &&
    Number.isFinite(c.lng) &&
    c.lat >= NORTH_PORTUGAL.minLat &&
    c.lat <= NORTH_PORTUGAL.maxLat &&
    c.lng >= NORTH_PORTUGAL.minLng &&
    c.lng <= NORTH_PORTUGAL.maxLng
  );
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;
const key = (c: Coords) => `${c.lat.toFixed(5)},${c.lng.toFixed(5)}`;

/** Returns the single distinct in-region point among the candidates, or null. */
function single(candidates: Coords[]): Coords | null {
  const distinct = new Map<string, Coords>();
  for (const c of candidates) if (inRegion(c)) distinct.set(key(c), { lat: round(c.lat), lng: round(c.lng) });
  // A page listing several venues (a calendar, a series) cannot say which is this event's.
  return distinct.size === 1 ? [...distinct.values()][0] : null;
}

const NUM = String.raw`"?(-?\d{1,3}(?:\.\d+)?)"?`;

/**
 * Reads the venue's coordinates from an event page's HTML.
 *
 * First choice is schema.org data ("latitude"/"longitude", as Eventbrite, Luma and
 * most ticketing pages publish for search engines). Failing that, an adjacent
 * "lat"/"lng" (or "lon") pair from the page's own app data (Meetup's venue object).
 */
export function coordsFromPage(html: string): Coords | null {
  const lats = [...html.matchAll(new RegExp(`"latitude"\\s*:\\s*${NUM}`, 'g'))].map((m) => Number(m[1]));
  const lngs = [...html.matchAll(new RegExp(`"longitude"\\s*:\\s*${NUM}`, 'g'))].map((m) => Number(m[1]));
  // Pair by order only when the counts agree; otherwise the pairing is a guess.
  if (lats.length > 0 && lats.length === lngs.length) {
    const found = single(lats.map((lat, i) => ({ lat, lng: lngs[i] })));
    if (found) return found;
  }
  const pairs = [
    ...html.matchAll(new RegExp(`"lat"\\s*:\\s*${NUM}\\s*,\\s*"(?:lng|lon)"\\s*:\\s*${NUM}`, 'g')),
  ].map((m) => ({ lat: Number(m[1]), lng: Number(m[2]) }));
  return single(pairs);
}

/** Town and country words that say where, but not where in town. */
const PLACE_WORDS = [
  'portugal',
  'porto',
  'oporto',
  'vila nova de gaia',
  'gaia',
  'matosinhos',
  'maia',
  'gondomar',
  'valongo',
  'espinho',
  'esmoriz',
  'ovar',
  'póvoa de varzim',
  'povoa de varzim',
  'vila do conde',
  'leça da palmeira',
  'leca da palmeira',
  'guimarães',
  'guimaraes',
  'braga',
  'aveiro',
  'online',
  'tba',
  'tbd',
  'to be announced',
  'location provided after registration',
  'secret location',
];

/**
 * True when a location says nothing more precise than the town: looking it up
 * would only return the town centre.
 */
export function isVagueLocation(location: string | null | undefined): boolean {
  let rest = ` ${(location ?? '').toLowerCase()} `;
  for (const w of [...PLACE_WORDS].sort((a, b) => b.length - a.length)) rest = rest.split(w).join(' ');
  rest = rest
    .replace(/\b\d{4}-\d{3}\b/g, ' ') // Portuguese postcode alone is not an address
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  return rest.length < 3;
}

/**
 * Cleans a stored location before looking it up. Scraped venue names sometimes
 * carry promotional text ("Scoundrels Distilling Co - INVICTA GIN - ... |"),
 * which confuses an address search; the part after the last "|" or the
 * comma-separated address is what matters.
 */
export function geocodeQuery(location: string): string {
  const parts = location
    .split('|')
    .map((p) => p.trim())
    .filter(Boolean);
  const best = parts.length > 1 ? parts[parts.length - 1] : parts[0] ?? '';
  const q = best.replace(/\s+/g, ' ').slice(0, 200);
  return /portugal/i.test(q) ? q : `${q}, Portugal`;
}

/** Nominatim result types too broad to be a venue. */
const TOO_BROAD = new Set([
  'country',
  'state',
  'region',
  'province',
  'county',
  'municipality',
  'city',
  'town',
  'village',
  'city_district',
  'district',
  'borough',
  'suburb',
  'quarter',
  'neighbourhood',
  'postcode',
  'administrative',
]);

export interface NominatimResult {
  lat: string;
  lon: string;
  addresstype?: string;
  type?: string;
  class?: string;
}

/** Keeps a lookup result only when it is a specific place inside the region. */
export function acceptGeocode(r: NominatimResult | undefined): Coords | null {
  if (!r) return null;
  const kind = (r.addresstype ?? r.type ?? '').toLowerCase();
  if (TOO_BROAD.has(kind)) return null;
  if (r.class === 'boundary') return null;
  const c = { lat: Number(r.lat), lng: Number(r.lon) };
  return inRegion(c) ? { lat: round(c.lat), lng: round(c.lng) } : null;
}
