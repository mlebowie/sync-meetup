-- More sources for thin interests -------------------------------------------------
-- ma.to: Porto venues' own listings (pop-ups, markets, workshops, gigs).
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_source_check;
ALTER TABLE public.events ADD CONSTRAINT events_source_check CHECK (
  source IN ('eventbrite','meetup','luma','agenda-porto','porto-coffee-week','expat-girls-porto','partner','fisga','ma-to')
);

-- Meetup groups with regular games, dance, tech and newcomer events: every day.
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname IN ('sync-collect-meetup-groups', 'sync-collect-ma-to');
SELECT cron.schedule('sync-collect-meetup-groups', '20 6 * * *', $$SELECT public.run_event_collector('meetup', 'groups')$$);
-- ma.to: Mondays and Thursdays, like the other themed runs.
SELECT cron.schedule('sync-collect-ma-to', '25 6 * * 1,4', $$SELECT public.run_event_collector('ma-to')$$);
