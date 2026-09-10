# Add Agenda Porto as a fourth event source

Agenda Porto (the city's official culture agenda) lists real Porto events with dates, venues, images and categories. Its event pages are readable, so it can be added alongside Eventbrite, Meetup and Lu.ma instead of a one-off manual copy.

## What you will see

- Many more real Porto events in the feed and calendar, especially concerts, exhibitions, film, theatre, talks, family and sports/outdoor listings.
- Each new event card shows title, date and time, venue, image, and a link back to its Agenda Porto page.
- A new "Agenda Porto" source badge next to the existing Eventbrite / Meetup / Lu.ma badges.
- These events refresh on the same daily schedule as the others, so the list stays current.

## Approach

1. Add `agenda-porto` as a source with a page budget, reading the English section listings:
   - Out and about (Ao Fresco), Art & exhibitions, Film, Talks, Sports and motion, Families, Music and clubbing, Stage
   - plus the main calendar page as a catch-all.
2. Extract each listing card with the existing Firecrawl JSON schema (title, url, date, time, venue, image, category, price, description).
3. Keep the existing date-truth step: confirm each event's start from its own event page before storing.
4. Map Agenda Porto's own section names onto SYNC interest labels so cards land in the right filters:
   - Music and clubbing → Music & live events
   - Art & exhibitions, Stage, Film → Arts & theatre
   - Talks → Education
   - Sports and motion → Sports (running/hiking/outdoor wording → Outdoors activities)
   - Ao Fresco / Out and about → Outdoors activities
   - Games → Games; Fair/Party/Pop-up wording → Pop-up events
   - Families and anything unmatched → falls through the existing keyword rules
5. Carry over the site's own tags where they map to existing flags (Pets Allowed → pet friendly, In English → useful for expats, Free → price label "Free").
6. Deploy the collector, run it once, then report how many events were added and the new category mix.

## Technical notes

- Edit `supabase/functions/scrape-events/index.ts`: extend `SourceId`, `SOURCE_PAGES`, `MAX_PAGES`, and add a source-aware branch in `canonicalCategory` that prefers the Agenda Porto section label before the generic keyword rules.
- The `events.source` column is free text, so no migration is needed; the frontend source badge map gets one new entry (`agenda-porto` → "Agenda Porto").
- Deduplication continues to use host + path as `source_event_id`, so re-runs update rather than duplicate.
- Only real published listings are stored; nothing is invented.
