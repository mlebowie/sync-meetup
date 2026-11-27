// What the automatic curator may do with an event, decided in code from the
// AI's review and the facts read off the event page. The AI drafts; these
// rules decide whether that draft is safe to publish without Emilie.

export const CATEGORIES = [
  'Social networking',
  'Professional development',
  'Tech & AI',
  'Arts & culture',
  'Music & live events',
  'Dance',
  'Sports',
  'Outdoors activities',
  'Health & wellness',
  'Spirituality',
  'Religion',
  'Dining & cooking',
  'Games',
  'Languages',
  'Cultural exchange',
  'Education',
  'Charity & non-profit',
  'Pop-up events',
] as const;

export interface PageFacts {
  /** The page could be read at all. */
  reachable: boolean;
  /** schema.org startDate/endDate, when the page has exactly one event. */
  startDate: string | null;
  endDate: string | null;
  /** schema.org eventStatus, e.g. https://schema.org/EventCancelled. */
  eventStatus: string | null;
  /** schema.org offers availability, e.g. https://schema.org/SoldOut. */
  availability: string | null;
  attendanceMode: string | null;
  image: string | null;
  /** The page's visible text, to check a time the AI read off it. */
  text?: string;
}

/** The page's text shows this Porto clock time ("15:00", "15h00", "3:00 PM", "3 PM"). */
export function textShowsClock(text: string | undefined, clock: string): boolean {
  if (!text) return false;
  const [h, m] = clock.split(':').map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const ampm = h < 12 ? 'am' : 'pm';
  const mm = String(m).padStart(2, '0');
  const forms = [
    `${String(h).padStart(2, '0')}:${mm}`,
    `${h}:${mm}`,
    `${h}h${mm}`,
    `${String(h).padStart(2, '0')}h${mm}`,
    `${h12}:${mm}\\s*${ampm}`,
    ...(m === 0 ? [`${h}h\\b`, `${h12}\\s*${ampm}`] : []),
  ];
  return new RegExp(`(^|[^0-9])(?:${forms.join('|')})`, 'i').test(text.replace(/\./g, ''));
}

export interface Review {
  decision: 'publish' | 'waitlist' | 'hide' | 'review';
  /** Why, in under 100 characters. */
  reason: string;
  /** For hide: cancelled | past | online | outside_porto | not_a_fit. */
  hide_kind?: string | null;
  description: string;
  price_label: string | null;
  is_paid: boolean | null;
  organizer_bio: string | null;
  /** A card title of 10 words at most, when the original is longer. */
  title?: string | null;
  /** Who runs the event, as the page names them. */
  organizer_name?: string | null;
  image_url: string | null;
  category: string;
  category_unclear?: boolean;
  /** Porto wall-clock start and end, YYYY-MM-DDTHH:MM. */
  start_local: string | null;
  end_local: string | null;
  recurrence: 'one-off' | 'weekly' | 'biweekly' | 'monthly';
}

export interface CurrentRow {
  title?: string;
  organizer_name?: string | null;
  starts_at: string;
  ends_at: string | null;
  image_url: string | null;
  tags: string[] | null;
  category: string | null;
  /** The collector's note, e.g. "Possible duplicate of … on Meetup". */
  review_note?: string | null;
}

export interface Outcome {
  action: 'publish' | 'waitlist' | 'hide' | 'flag';
  note: string | null;
  patch: Record<string, unknown>;
}

const DAY_MS = 86_400_000;

/** Builds an instant from a Porto calendar date + wall clock, honouring DST. */
export function lisbonInstant(local: string): Date {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!m) return new Date(NaN);
  const clock = `${m[2]}:${m[3]}`;
  const guess = new Date(`${m[1]}T${clock}:00Z`);
  const asLisbon = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Lisbon',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(guess);
  const [gh, gm] = asLisbon.split(':').map(Number);
  let diff = gh * 60 + gm - (Number(m[2]) * 60 + Number(m[3]));
  if (diff > 720) diff -= 1440;
  if (diff < -720) diff += 1440;
  return new Date(guess.getTime() - diff * 60_000);
}

export function portoClock(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Lisbon',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** A page date with a clock ("2026-11-22T15:00:00Z"), not a bare day. */
const hasClock = (s: string | null) => !!s && /T\d{2}:\d{2}/.test(s);

/** Hiding needs a reason that is clear-cut, never a judgement call. */
const HIDE_KINDS = new Set(['cancelled', 'past', 'online', 'outside_porto']);

export function decide(review: Review, page: PageFacts, row: CurrentRow, now = new Date()): Outcome {
  const flags: string[] = [];
  const patch: Record<string, unknown> = {};

  // --- clear-cut facts from the page come first ----------------------------
  if (page.eventStatus && /Cancelled/i.test(page.eventStatus)) {
    return hide('Cancelled at source');
  }
  if (page.startDate && new Date(page.startDate).getTime() + 6 * 3600_000 < now.getTime()) {
    return hide(`Already took place on ${page.startDate.slice(0, 10)}`);
  }
  if (page.attendanceMode && /Online/i.test(page.attendanceMode) && !/Mixed/i.test(page.attendanceMode)) {
    return hide('Online-only event');
  }
  if (!page.reachable) {
    return { action: 'flag', note: 'Event page unreachable', patch: {} };
  }

  if (review.decision === 'hide') {
    if (review.hide_kind && HIDE_KINDS.has(review.hide_kind)) return hide(review.reason || 'Not for SYNC');
    // A judgement call ("not a fit") stays with Emilie.
    flags.push(review.reason ? `May not fit SYNC: ${review.reason}` : 'May not fit SYNC');
  }
  if (review.decision === 'review') flags.push(review.reason || 'Needs a closer look');

  // --- the same event on another platform: Emilie keeps one ------------------
  for (const f of (row.review_note ?? '').split(' · ')) {
    if (/^(Possible duplicate of|Different price on)/.test(f)) flags.push(f);
  }

  // --- description ----------------------------------------------------------
  const description = (review.description ?? '').trim();
  const n = words(description);
  if (n >= 25 && n <= 300) patch.description = description;
  else flags.push('Description needs writing');

  // --- price ----------------------------------------------------------------
  const price = review.price_label?.trim() || (review.is_paid === false ? 'Free' : null);
  if (price) patch.price_label = price;
  if (review.is_paid === true && (!price || /^free$/i.test(price))) flags.push('Paid, but price not stated');
  if (review.is_paid === true && !/paid|ticket|€/i.test(description)) flags.push('Paid event not explained');
  if (review.is_paid == null && !price) flags.push('Price not stated');

  // --- title: two lines on the card, so 10 words at most ------------------------
  const currentWords = words(row.title ?? '');
  const shorter = review.title?.trim();
  if (shorter && shorter !== row.title && words(shorter) <= 10) patch.title = shorter.slice(0, 120);
  else if (currentWords > 10) flags.push('Title over 10 words');

  // --- organiser: every published card names one ------------------------------
  const organizer = row.organizer_name?.trim() || review.organizer_name?.trim() || null;
  if (!organizer) flags.push('Organiser missing');
  else if (!row.organizer_name?.trim()) patch.organizer_name = organizer.slice(0, 200);

  // --- organiser bio ----------------------------------------------------------
  if (review.organizer_bio?.trim()) patch.organizer_bio = review.organizer_bio.trim();

  // --- photo ----------------------------------------------------------------
  const image = [review.image_url, page.image, row.image_url].find((u) => !!u && /^https:\/\//.test(u)) ?? null;
  if (image) patch.image_url = image;
  else flags.push('No event photo found');

  // --- category -------------------------------------------------------------
  if ((CATEGORIES as readonly string[]).includes(review.category)) {
    patch.category = review.category;
    if (review.category_unclear) flags.push(`Category unclear: ${review.category}?`);
  } else {
    flags.push('Category unclear');
  }

  // --- date and time: the page's own startDate wins -------------------------
  let start: Date | null = null;
  if (hasClock(page.startDate)) {
    start = new Date(page.startDate!);
  } else if (review.start_local) {
    const fromReview = lisbonInstant(review.start_local);
    // Without a dated page, accept the AI's reading only when it agrees with
    // what SYNC already holds; a change of time needs Emilie.
    if (
      !isNaN(fromReview.getTime()) &&
      Math.abs(fromReview.getTime() - new Date(row.starts_at).getTime()) < 60_000 &&
      textShowsClock(page.text, portoClock(fromReview))
    ) {
      start = fromReview;
    } else if (!isNaN(fromReview.getTime())) {
      flags.push(`Time not confirmed: page suggests ${review.start_local.replace('T', ' ')}`);
    }
  }
  if (!start) {
    if (!flags.some((f) => f.startsWith('Time not confirmed'))) flags.push('Time not confirmed on the event page');
  } else {
    if (start.getTime() < now.getTime() + DAY_MS) flags.push('Starts within 24 hours');
    patch.starts_at = start.toISOString();
    let end: Date | null = null;
    if (hasClock(page.endDate)) end = new Date(page.endDate!);
    else if (review.end_local) end = lisbonInstant(review.end_local);
    if (end && !isNaN(end.getTime()) && end > start && end.getTime() - start.getTime() < 14 * DAY_MS) {
      patch.ends_at = end.toISOString();
      patch.time_label = `${portoClock(start)}–${portoClock(end)}`;
    } else {
      patch.time_label = portoClock(start);
    }
  }

  // --- repeats and capacity ---------------------------------------------------
  if (['one-off', 'weekly', 'biweekly', 'monthly'].includes(review.recurrence)) patch.recurrence = review.recurrence;
  const full = review.decision === 'waitlist' || (!!page.availability && /SoldOut/i.test(page.availability));
  const tags = (row.tags ?? []).filter((t) => t !== 'sold-out');
  patch.tags = full ? [...tags, 'sold-out'] : tags;

  if (flags.length) {
    return { action: 'flag', note: flags.join(' · ').slice(0, 200), patch };
  }
  return { action: full ? 'waitlist' : 'publish', note: null, patch };

  function hide(note: string): Outcome {
    return { action: 'hide', note, patch: {} };
  }
}
