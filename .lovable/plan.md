# Keep event titles and descriptions in English

Yes. SYNC can prefer an event platform’s own English copy and translate only when the available title or description is not English.

## What will change

- Keep English titles and descriptions unchanged, preserving the organizer’s wording.
- When either field is Portuguese or another language, translate that field into natural English during collection.
- Preserve names of people, venues, organizations, event brands, URLs, dates, prices, and other factual details exactly.
- Apply the same rule to Eventbrite, Meetup, Lu.ma, and Agenda Porto. Agenda Porto will continue using its English pages first.
- Refresh existing upcoming events so already-stored non-English titles and descriptions also become English.

## Implementation

1. Update the structured event-extraction instructions to explicitly return `title` and `description` in English: copy existing English text verbatim; otherwise translate it without summarizing or inventing details.
2. Keep all non-copy fields sourced directly from the listing, including dates, times, venues, organizers, categories, and links.
3. Add a controlled content-refresh option to the collector so existing upcoming events can be re-read and updated without creating duplicates.
4. Run that refresh once for all four sources, then return to the normal daily flow that skips unchanged upcoming events.
5. Verify a sample from every source, confirming English copy, preserved proper names, correct dates/times, and unchanged source links.

## Technical notes

- The change stays in `supabase/functions/scrape-events/index.ts`; no database migration or frontend change is required.
- Translation will use the structured extraction already performed by Firecrawl, avoiding a second AI request for every event.
- Deduplication remains based on source and source event ID, so refreshing copy updates rows rather than duplicating cards.
