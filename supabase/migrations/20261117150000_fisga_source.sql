-- Fisga (fisga.space) community agenda: a new source, collected once a week.
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_source_check;
ALTER TABLE public.events ADD CONSTRAINT events_source_check CHECK (
  source IN ('eventbrite','meetup','luma','agenda-porto','porto-coffee-week','expat-girls-porto','partner','fisga')
);

-- Mondays at 06:10 UTC, between the themed runs and the partner pass.
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'sync-collect-fisga';
SELECT cron.schedule('sync-collect-fisga', '10 6 * * 1', $$SELECT public.run_event_collector('fisga')$$);
