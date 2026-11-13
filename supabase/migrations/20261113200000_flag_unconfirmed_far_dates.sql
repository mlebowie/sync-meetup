-- Events already in Waiting were saved before the collector checked dates
-- against the event page and the card's weekday. Those more than four months
-- away are the likeliest to carry a guessed year, so flag them for the
-- curator (a note only; nothing is hidden or moved).
UPDATE public.events
SET review_note = 'Date not confirmed on the event page; check the year'
WHERE review_status = 'pending'
  AND review_note IS NULL
  AND starts_at > now() + interval '120 days'
  AND source IN ('meetup', 'eventbrite', 'luma');
