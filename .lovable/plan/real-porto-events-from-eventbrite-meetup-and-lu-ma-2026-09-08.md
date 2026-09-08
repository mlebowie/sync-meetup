# Real Porto events from Eventbrite, Meetup and Lu.ma

Replace the sample events with real, currently listed Porto events, refreshed automatically once a day.

## What changes for the user

- The home feed, carousels and calendar show real events happening in Porto, with real titles, dates, times, venues, prices, cover photos and links back to the original listing.
- Each card keeps its source badge (Eventbrite / Meetup / Lu.ma) and an "Open on Eventbrite" style link in the event preview.
- Events refresh once a day in the background, so opening the app is fast — no waiting on a live fetch.
- A small "Updated today at HH:MM" note appears above the upcoming events section.
- Sample events are removed from the feed. If a daily refresh fails, the feed keeps showing yesterday's real events rather than going blank.

## How the events are collected

Scraping is done with Firecrawl (a scraping service). You will be asked to connect it once — no code changes needed on your side.

Sources scraped for Porto:
- Eventbrite Porto browse pages (structured event data)
- Meetup Porto find pages, including recurring group series
- Lu.ma Porto discover page

For each event we capture: title, description, start date/time, venue name and address, cover image, organizer name, attendee/capacity numbers when published, category, price, and the original URL.

## Filling the SYNC-specific fields

Real listings don't publish activity level, intensity, group size or inclusivity flags. Those are derived once per event at collection time:
- Group size from capacity, or from the venue/format when capacity is missing.
- Activity level and intensity inferred from category and description keywords (hike/run = high/energetic, language exchange = low/social, etc.), using a single AI classification pass per new event so filters and the tutorial keep working.
- Recurrence and series detected from Meetup group series and repeated titles, so "Nth time for you" still works.
- Inclusivity flags (women-only, LGBTQ+ friendly, pet friendly) set only when the listing states them.
- Participants shown on cards come from SYNC's own registrations; scraped attendee counts drive the "x/y" number.

## Technical notes

Backend (Lovable Cloud):
- New tables: `events` (all scraped fields, `source`, `source_url`, unique on source + source id, derived filter fields, `last_seen_at`) and `event_scrape_runs` (run status, per-source counts, errors, lock lease for single-flight).
- RLS: public read on `events` for anon and authenticated; writes limited to the service role. GRANTs issued in the same migration.
- Edge function `scrape-events`: bounded per run (per-source page cap and item cap), single-flight lease, upsert by source id, idempotent progress marking, circuit breaker that parks the run on repeated rate limits or credit/permission denials and records it in `event_scrape_runs`.
- Classification uses the Lovable AI gateway in small batches, only for events not yet classified.
- Scheduled once daily via pg_cron calling the function; events not seen for 2 runs and already past are pruned.

Frontend:
- `src/lib/events.ts` fetches events from the database with React Query; `mockData.ts` stays in the repo only as the type reference and test fixture, no longer feeding the feed.
- `dailyEvents.ts` rotation keeps working, now over the real rows, still anchoring the soonest event to the next hour.
- `Event` type gains `sourceUrl`, `priceLabel`, `updatedAt`; event preview gains the source link.
- Loading skeletons and an empty state for the first run before any scrape has completed.

## Steps

1. Connect Firecrawl.
2. Create the tables, policies and grants.
3. Build the `scrape-events` function for the three sources with derivation and safety limits.
4. Run it once and check the imported events.
5. Point the feed, carousels and calendar at the database, with loading and empty states.
6. Schedule the daily refresh and show the "Updated today" note.
