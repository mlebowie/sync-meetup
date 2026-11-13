-- Why an event needs the curator's attention (e.g. "No photo found on the event
-- page", "Category unclear"). Shown as a "Needs review" badge in Waiting on
-- /curate and cleared when the event is published or edited there.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS review_note text;
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_review_note_length;
ALTER TABLE public.events ADD CONSTRAINT events_review_note_length
  CHECK (review_note IS NULL OR char_length(review_note) <= 500);
