-- Remove from SYNC ------------------------------------------------------------------
-- Hiding an event only hides that one card. Removing it also tells the collector
-- not to bring it (or events like it) back: this event, every date of its series,
-- everything from its organiser, or any event whose title has certain words.
CREATE TABLE IF NOT EXISTS public.collector_exclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('event', 'series', 'organiser', 'title')),
  -- event: "<source>:<source_event_id>"; series: series_key;
  -- organiser: match_key(organiser); title: match_key(words) found in the title.
  value text NOT NULL,
  label text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, value)
);
ALTER TABLE public.collector_exclusions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage collector exclusions" ON public.collector_exclusions;
CREATE POLICY "Admins manage collector exclusions" ON public.collector_exclusions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Removes an event: records the rule, hides the event and every other event in
-- Waiting that the rule covers. Returns how many events were hidden.
CREATE OR REPLACE FUNCTION public.remove_from_collection(_event_id uuid, _kind text, _words text DEFAULT NULL, _reason text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e public.events;
  v text;
  label text;
  n integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admins only';
  END IF;
  SELECT * INTO e FROM public.events WHERE id = _event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such event';
  END IF;

  IF _kind = 'event' THEN
    v := e.source || ':' || e.source_event_id;
    label := e.title;
  ELSIF _kind = 'series' THEN
    v := coalesce(e.series_key, e.source || ':' || e.source_event_id);
    label := 'All dates of ' || e.title;
  ELSIF _kind = 'organiser' THEN
    v := public.match_key(e.organizer_name);
    label := 'Everything from ' || coalesce(e.organizer_name, '?');
  ELSIF _kind = 'title' THEN
    v := public.match_key(coalesce(nullif(_words, ''), e.title));
    label := 'Titles with "' || coalesce(nullif(_words, ''), e.title) || '"';
  ELSE
    RAISE EXCEPTION 'Unknown kind %', _kind;
  END IF;
  IF coalesce(v, '') = '' THEN
    RAISE EXCEPTION 'Nothing to match on';
  END IF;

  INSERT INTO public.collector_exclusions (kind, value, label, reason)
  VALUES (_kind, v, label, nullif(_reason, ''))
  ON CONFLICT (kind, value) DO UPDATE SET reason = coalesce(EXCLUDED.reason, collector_exclusions.reason);

  UPDATE public.events x
  SET review_status = 'rejected',
      reviewed_at = now(),
      review_note = 'Removed: ' || label || coalesce(' (' || nullif(_reason, '') || ')', ''),
      updated_at = now()
  WHERE x.id = _event_id
     OR (x.review_status = 'pending' AND x.starts_at > now() AND (
          (_kind = 'series' AND x.series_key IS NOT NULL AND x.series_key = v)
       OR (_kind = 'organiser' AND public.match_key(x.organizer_name) = v)
       OR (_kind = 'title' AND (' ' || public.match_key(x.title) || ' ') LIKE ('% ' || v || ' %'))));
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.remove_from_collection(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_from_collection(uuid, text, text, text) TO authenticated;

-- Retries ---------------------------------------------------------------------------
-- A morning run can fail for reasons that pass (the AI service busy, a site slow).
-- Re-run each source whose last run today failed, at most twice a morning.
CREATE OR REPLACE FUNCTION public.retry_failed_collections()
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  src text;
  retried text[] := '{}';
BEGIN
  FOR src IN
    SELECT s FROM (
      SELECT DISTINCT ON (k) k AS s, r.status
      FROM public.event_scrape_runs r, jsonb_object_keys(coalesce(r.source_counts, '{}'::jsonb)) k
      WHERE r.started_at >= date_trunc('day', now())
      ORDER BY k, r.started_at DESC
    ) last_run
    WHERE last_run.status = 'failed'
  LOOP
    PERFORM public.run_event_collector(src);
    retried := retried || src;
  END LOOP;
  RETURN retried;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.retry_failed_collections() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'sync-retry-failed';
SELECT cron.schedule('sync-retry-failed', '40 6,7 * * *', $$SELECT public.retry_failed_collections()$$);
