---
name: rotating-time-based-events
description: Make a list of mock/template events feel fresh on every visit by deterministically reshuffling them per calendar day and anchoring the soonest event to the next upcoming hour. Use when the user asks for "daily refresh", "rotating events", "events based on the current hour", or similar time-based liveness on a static event list.
---

# Rotating Time-Based Events

Static `mockEvents` arrays feel stale because the dates never move. This skill turns a fixed template list into a feed that:

1. **Rotates daily** — same order all day, fresh order tomorrow (deterministic per `YYYY-MM-DD`).
2. **Anchors to "now"** — the soonest event always starts at the next full hour from the current time.
3. **Spreads the rest** — remaining events get vibe-appropriate times (sunrise runs in the AM, salsa nights in the PM) across the next ~14 days.

## When to apply

Trigger when the user asks for any of:
- "rotate events daily / hourly"
- "show fresh events every time"
- "events based on the most recent hour / upcoming hour"
- "make the upcoming events feel live without a backend"

Do NOT apply if the project already has a real events backend — fetch from there instead.

## Implementation pattern

Create `src/lib/dailyEvents.ts` with a `getDailyRotatingEvents(templates, now?)` helper. Keep the template array (e.g. `mockEvents`) untouched — the helper produces a re-dated copy.

Required pieces:

- **Seeded PRNG** (mulberry32) seeded from `YYYYMMDD` of `now` — guarantees same order all day.
- **Fisher–Yates shuffle** driven by the seeded PRNG.
- **First slot = next full hour** from `now` (`setMinutes(0,0,0); setHours(h+1)`).
- **Vibe-aware hour picker** — regex over `title + tags` to keep "sunrise" in the AM and "night/salsa" in the PM. Fallback to afternoon.
- **Return sorted by `date` ascending** so the soonest is first.

Wire-in: in the page that renders the grid, replace `useState<Event[]>(mockEvents)` with `useState<Event[]>(() => getDailyRotatingEvents(mockEvents))`. Use the lazy initializer so it runs once per mount (== once per visit).

## Type contract

The helper must preserve every field on `Event` except `date` (replaced with a real `Date`) and `time` (replaced with a formatted string like `"6:30 PM"`).

## Why this shape

- **No backend needed** — works entirely client-side on mock data.
- **Deterministic per day** — reloading mid-session does not reshuffle, which prevents a confusing "events jumped" effect.
- **Tomorrow is automatically different** — the seed changes at local midnight.
- **First card is always actionable** — anchoring to the next hour makes the page feel live.

## Reference implementation

See `references/daily-events.ts` for the full helper used in the Sync project — copy it verbatim and only adjust the vibe regexes if the project's event taxonomy is very different.
