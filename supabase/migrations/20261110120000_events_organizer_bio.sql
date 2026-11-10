-- A few lines from the host about themselves, entered while curating. Shown as
-- "About the host" in event details only when filled in.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS organizer_bio text;
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_organizer_bio_length;
ALTER TABLE public.events ADD CONSTRAINT events_organizer_bio_length
  CHECK (organizer_bio IS NULL OR char_length(organizer_bio) <= 1500);
