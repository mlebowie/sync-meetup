DROP POLICY IF EXISTS "Scrape runs are publicly readable" ON public.event_scrape_runs;
REVOKE SELECT ON public.event_scrape_runs FROM anon;
REVOKE SELECT ON public.event_scrape_runs FROM authenticated;
GRANT ALL ON public.event_scrape_runs TO service_role;