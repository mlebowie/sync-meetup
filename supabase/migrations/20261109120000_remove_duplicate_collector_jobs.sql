-- The 30 Sept dashboard change scheduled its own collector runs at 08:00 and
-- 09:00 (jobs named collect-*). The sync-collect-* jobs replace them; running
-- both would spend Firecrawl credits twice.
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname LIKE 'collect-%';

-- Runs cut off before the time-limit fix are still marked 'running'.
UPDATE public.event_scrape_runs
SET status = 'failed', lease_until = null, finished_at = coalesce(finished_at, now()),
    error_details = coalesce(error_details, 'Stopped before finishing (edge function time limit)')
WHERE status = 'running' AND started_at < now() - interval '10 minutes';
