-- One "Vibe" field replaces the separate activity level (physical effort) and
-- intensity (social energy) labels. Vibe ranks the social energy of an event:
--   chill  – relaxed, low-pressure, fine to arrive alone and observe
--   social – built around conversation; mingling expected, still easygoing
--   lively – high energy and loud: crowds, music, momentum
--
-- The old activity_level and intensity columns are left in place (no longer
-- written by the app) so this change can be rolled back. Drop them in a later
-- migration once the Vibe field has settled.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS vibe TEXT NOT NULL DEFAULT 'social'
  CHECK (vibe IN ('chill', 'social', 'lively'));

-- Backfill from the old social-energy label; "energetic" becomes "lively".
UPDATE public.events
SET vibe = CASE intensity
  WHEN 'chill' THEN 'chill'
  WHEN 'energetic' THEN 'lively'
  ELSE 'social'
END;

CREATE INDEX IF NOT EXISTS events_vibe_idx ON public.events (vibe);
