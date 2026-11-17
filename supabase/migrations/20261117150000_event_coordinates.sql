-- Event coordinates -----------------------------------------------------------
-- events.lat / events.lng existed but were never filled. They now come from:
--   'page'      the event page's own data, read by scrape-events
--   'geocoded'  an address lookup by geocode-events (OpenStreetMap Nominatim)
--   'manual'    set by a curator
-- and two outcomes that leave them empty on purpose:
--   'vague'     the address names only the town ("Porto, Portugal"); a lookup
--               would return the town centre and look like a precise pin
--   'not_found' the lookup found no specific place
-- geocoded_at records when the event was last tried; clear it to try again.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS geo_source text,
  ADD COLUMN IF NOT EXISTS geocoded_at timestamptz;

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_geo_source_check;
ALTER TABLE public.events ADD CONSTRAINT events_geo_source_check CHECK (
  geo_source IS NULL OR geo_source IN ('page', 'geocoded', 'manual', 'vague', 'not_found')
);

-- Daily address lookup, after the collectors (05:00–05:20 UTC) ----------------
-- Uses the same Vault secrets as run_event_collector (see MIGRATION.md).
CREATE OR REPLACE FUNCTION public.run_event_geocoder()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'sync_project_url')
           || '/functions/v1/geocode-events',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' ||
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'sync_service_role_key')
    ),
    body := jsonb_build_object('limit', 60),
    timeout_milliseconds := 150000
  );
$$;

REVOKE EXECUTE ON FUNCTION public.run_event_geocoder() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname LIKE 'sync-geocode-%';
SELECT cron.schedule('sync-geocode-morning', '40 5 * * *', $$SELECT public.run_event_geocoder()$$);
