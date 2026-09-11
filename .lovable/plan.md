# Keep only English-language events

SYNC will prefer an event platform’s own English copy, translate Portuguese listing text only when the event itself is conducted in English, and exclude events conducted only in Portuguese.

## What will change

- Keep English titles and descriptions unchanged, preserving the organizer’s wording.
- Determine the event’s spoken or participation language from explicit listing evidence such as “In English,” “English-speaking,” or a stated event language.
- Keep events explicitly conducted in English, including multilingual events where English participation is supported.
- If an English-conducted event has only Portuguese listing copy, translate its title and description into natural English.
- Exclude events explicitly conducted only in Portuguese or another non-English language.
- When the event language is not stated, keep it only when the source title and description are already in English; do not translate ambiguous Portuguese listings into the feed.
- Preserve names of people, venues, organizations, event brands, URLs, dates, prices, and other factual details exactly.
- Apply the same rule to Eventbrite, Meetup, Lu.ma, and Agenda Porto. Agenda Porto will continue using its English pages first.
- Refresh existing upcoming events so non-English-only events are removed and eligible English events have English copy.

## Implementation

1. Extend structured extraction with an event-language decision and supporting evidence from the listing; never infer the event’s spoken language from location alone.
2. Filter out listings explicitly conducted only in Portuguese or another non-English language. Treat unstated Portuguese copy as ineligible rather than translating it speculatively.
3. For eligible events, return `title` and `description` in English: preserve existing English copy, or translate Portuguese copy only when the listing confirms the event itself supports English.
4. Keep all non-copy fields sourced directly from the listing, including dates, times, venues, organizers, categories, and links.
5. Add a controlled content-refresh option so existing upcoming events can be reassessed and updated without creating duplicates; remove stored events that fail the English-language rule.
6. Run that refresh once for all four sources, then return to the normal daily flow that skips unchanged eligible events.
7. Verify samples from every source, including an English event, an English-supported event with Portuguese copy, a Portuguese-only event, and an ambiguous Portuguese listing.

## Technical notes

- The change stays in `supabase/functions/scrape-events/index.ts`; no database migration or frontend change is required.
- Language eligibility and translation will use the structured extraction already performed by Firecrawl, avoiding a second AI request for every event.
- The default for uncertain language is exclusion, preventing translated Portuguese-only events from appearing as English events.
- Deduplication remains based on source and source event ID, so refreshing copy updates rows rather than duplicating cards.
