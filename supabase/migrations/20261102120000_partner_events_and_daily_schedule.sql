-- 1. Partner events pasted in from /curate ----------------------------------
-- 'partner' covers any community partner without its own source badge; the
-- partner's name is kept in organizer_name.
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_source_check;
ALTER TABLE public.events ADD CONSTRAINT events_source_check CHECK (
  source IN ('eventbrite','meetup','luma','agenda-porto','porto-coffee-week','expat-girls-porto','partner')
);

-- Admins may add events by hand (they always land in the review queue first).
DROP POLICY IF EXISTS "Admins can insert events" ON public.events;
CREATE POLICY "Admins can insert events"
ON public.events FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT INSERT ON public.events TO authenticated;

-- 2. Daily collection --------------------------------------------------------
-- One run per source, staggered, because a single run stops after ~110s and
-- would otherwise rarely reach the later sources.
--
-- The jobs read two secrets from Supabase Vault at run time. Create them once
-- in the SQL editor (see MIGRATION.md, "Turn the daily collector back on"):
--   select vault.create_secret('https://<ref>.supabase.co', 'sync_project_url');
--   select vault.create_secret('<service role key>', 'sync_service_role_key');
-- Until both exist the jobs simply fail quietly; nothing else is affected.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- The 30 Sept dashboard change created an older version of this function with a
-- different return type, so it is dropped first rather than replaced in place.
DROP FUNCTION IF EXISTS public.run_event_collector(text);

CREATE OR REPLACE FUNCTION public.run_event_collector(_source text)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'sync_project_url')
           || '/functions/v1/scrape-events',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' ||
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'sync_service_role_key')
    ),
    body := jsonb_build_object('sources', jsonb_build_array(_source)),
    timeout_milliseconds := 150000
  );
$$;

REVOKE EXECUTE ON FUNCTION public.run_event_collector(text) FROM PUBLIC, anon, authenticated;

-- Remove earlier versions of these jobs so the migration can be re-run safely,
-- plus any older schedule that called the collector directly (e.g. from 30 Sept).
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname LIKE 'sync-collect-%';
SELECT cron.unschedule(jobid) FROM cron.job
WHERE command ILIKE '%scrape-events%' AND coalesce(jobname, '') NOT LIKE 'sync-collect-%';

-- Times are UTC (05:00 UTC = 05:00 Lisbon in winter, 06:00 in summer).
SELECT cron.schedule('sync-collect-luma',              '0 5 * * *',  $$SELECT public.run_event_collector('luma')$$);
SELECT cron.schedule('sync-collect-meetup',            '5 5 * * *',  $$SELECT public.run_event_collector('meetup')$$);
SELECT cron.schedule('sync-collect-eventbrite',        '10 5 * * *', $$SELECT public.run_event_collector('eventbrite')$$);
SELECT cron.schedule('sync-collect-agenda-porto',      '15 5 * * *', $$SELECT public.run_event_collector('agenda-porto')$$);
SELECT cron.schedule('sync-collect-porto-coffee-week', '20 5 * * 1', $$SELECT public.run_event_collector('porto-coffee-week')$$);
