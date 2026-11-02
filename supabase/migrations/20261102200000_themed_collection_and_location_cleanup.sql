-- 1. Hide events already waiting for review that are in Lisbon or online-only.
-- They move to the Hidden tab on /curate (so they can be restored) and the
-- collector will not bring them back.
UPDATE public.events
SET review_status = 'rejected', reviewed_at = now()
WHERE review_status = 'pending'
  AND (
    coalesce(location, '') || ' ' || coalesce(venue_name, '') || ' ' || title
      ~* '\m(lisboa|lisbon|cascais|sintra|oeiras|almada)\M'
    OR coalesce(location, '') || ' ' || coalesce(venue_name, '')
      ~* '\m(online|virtual|zoom|webinar|livestream)\M'
  );

-- 2. The collector now takes an optional focus: general, sports, languages or outdoors.
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname LIKE 'sync-collect-%';
DROP FUNCTION IF EXISTS public.run_event_collector(text);
DROP FUNCTION IF EXISTS public.run_event_collector(text, text);

CREATE OR REPLACE FUNCTION public.run_event_collector(_source text, _focus text DEFAULT 'general')
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
    body := jsonb_build_object('sources', jsonb_build_array(_source), 'focus', _focus),
    timeout_milliseconds := 150000
  );
$$;

REVOKE EXECUTE ON FUNCTION public.run_event_collector(text, text) FROM PUBLIC, anon, authenticated;

-- 3. Schedule (UTC). General listings daily; themed searches Mondays and
-- Thursdays, which is plenty for sports, language meetups and trips and keeps
-- Firecrawl usage moderate. Runs are five minutes apart so they never overlap.
SELECT cron.schedule('sync-collect-luma',              '0 5 * * *',  $$SELECT public.run_event_collector('luma')$$);
SELECT cron.schedule('sync-collect-meetup',            '5 5 * * *',  $$SELECT public.run_event_collector('meetup')$$);
SELECT cron.schedule('sync-collect-eventbrite',        '10 5 * * *', $$SELECT public.run_event_collector('eventbrite')$$);
SELECT cron.schedule('sync-collect-agenda-porto',      '15 5 * * *', $$SELECT public.run_event_collector('agenda-porto')$$);
SELECT cron.schedule('sync-collect-porto-coffee-week', '20 5 * * 1', $$SELECT public.run_event_collector('porto-coffee-week')$$);

SELECT cron.schedule('sync-collect-meetup-sports',        '25 5 * * 1,4', $$SELECT public.run_event_collector('meetup', 'sports')$$);
SELECT cron.schedule('sync-collect-eventbrite-sports',    '30 5 * * 1,4', $$SELECT public.run_event_collector('eventbrite', 'sports')$$);
SELECT cron.schedule('sync-collect-luma-sports',          '35 5 * * 1,4', $$SELECT public.run_event_collector('luma', 'sports')$$);
SELECT cron.schedule('sync-collect-meetup-languages',     '40 5 * * 1,4', $$SELECT public.run_event_collector('meetup', 'languages')$$);
SELECT cron.schedule('sync-collect-eventbrite-languages', '45 5 * * 1,4', $$SELECT public.run_event_collector('eventbrite', 'languages')$$);
SELECT cron.schedule('sync-collect-luma-languages',       '50 5 * * 1,4', $$SELECT public.run_event_collector('luma', 'languages')$$);
SELECT cron.schedule('sync-collect-meetup-outdoors',      '55 5 * * 1,4', $$SELECT public.run_event_collector('meetup', 'outdoors')$$);
SELECT cron.schedule('sync-collect-eventbrite-outdoors',  '0 6 * * 1,4',  $$SELECT public.run_event_collector('eventbrite', 'outdoors')$$);
SELECT cron.schedule('sync-collect-luma-outdoors',        '5 6 * * 1,4',  $$SELECT public.run_event_collector('luma', 'outdoors')$$);
