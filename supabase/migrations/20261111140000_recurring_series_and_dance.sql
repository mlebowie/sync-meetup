-- Recurring events -----------------------------------------------------------
-- A series is every event with the same series_key. The curator sets
-- recurrence (weekly, biweekly, monthly) and an optional last date on any event,
-- scraped or added by hand; SYNC then creates the upcoming dates as separate
-- events (series_generated = true) so date filters, attendees and hiding work
-- per date. A daily job keeps each series six weeks ahead.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS repeat_until date;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS series_generated boolean NOT NULL DEFAULT false;
-- Set when the curator turns on Repeats in SYNC. A source's own "every week"
-- label sets recurrence (for the badge) but never generates dates by itself.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS generate_dates boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS events_series_key_idx ON public.events (series_key) WHERE series_key IS NOT NULL;

-- The next date of a series, in Porto wall-clock time. Monthly keeps the same
-- weekday position ("2nd Wednesday"); a 5th weekday becomes the month's last.
CREATE OR REPLACE FUNCTION public.next_series_date(_local timestamp, _recurrence text)
RETURNS timestamp
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  n int;
  first_of_next date;
  d date;
BEGIN
  IF _recurrence = 'weekly' THEN
    RETURN _local + interval '7 days';
  ELSIF _recurrence = 'biweekly' THEN
    RETURN _local + interval '14 days';
  ELSIF _recurrence = 'monthly' THEN
    n := (extract(day FROM _local)::int - 1) / 7 + 1;
    first_of_next := (date_trunc('month', _local) + interval '1 month')::date;
    d := first_of_next + ((extract(dow FROM _local)::int - extract(dow FROM first_of_next)::int + 7) % 7);
    IF n >= 5 THEN
      d := d + 28;
      IF extract(month FROM d) <> extract(month FROM first_of_next) THEN d := d - 7; END IF;
    ELSE
      d := d + (n - 1) * 7;
    END IF;
    RETURN d + _local::time;
  END IF;
  RETURN NULL;
END;
$$;

-- Creates the missing upcoming dates of one series (or of all, when _series_key
-- is null) up to _horizon_days ahead. Returns how many dates were added.
CREATE OR REPLACE FUNCTION public.extend_event_series(_series_key text DEFAULT NULL, _horizon_days int DEFAULT 42)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s record;
  t public.events;
  last_local timestamp;
  nxt timestamp;
  horizon timestamp := (now() AT TIME ZONE 'Europe/Lisbon') + make_interval(days => _horizon_days);
  added integer := 0;
  guard integer;
BEGIN
  -- Signed-in callers must be admins; the scheduler (no user) may always run it.
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admins only';
  END IF;

  FOR s IN
    SELECT DISTINCT series_key FROM public.events
    WHERE series_key IS NOT NULL AND (_series_key IS NULL OR series_key = _series_key)
  LOOP
    -- The latest date that is not hidden carries the series' current details.
    SELECT * INTO t FROM public.events
    WHERE series_key = s.series_key AND review_status <> 'rejected'
    ORDER BY starts_at DESC LIMIT 1;
    CONTINUE WHEN t.id IS NULL OR t.recurrence = 'one-off' OR NOT t.generate_dates;

    SELECT max(starts_at) AT TIME ZONE 'Europe/Lisbon' INTO last_local
    FROM public.events WHERE series_key = s.series_key;

    guard := 0;
    LOOP
      nxt := public.next_series_date(last_local, t.recurrence);
      EXIT WHEN nxt IS NULL OR nxt > horizon OR guard >= 60;
      EXIT WHEN t.repeat_until IS NOT NULL AND nxt::date > t.repeat_until;
      guard := guard + 1;
      last_local := nxt;
      CONTINUE WHEN (nxt AT TIME ZONE 'Europe/Lisbon') < now();

      INSERT INTO public.events
      SELECT (jsonb_populate_record(NULL::public.events, to_jsonb(t) || jsonb_build_object(
        'id', gen_random_uuid(),
        'source_event_id', left(split_part(t.source_event_id, '~', 1), 180) || '~' || to_char(nxt, 'YYYY-MM-DD'),
        'starts_at', nxt AT TIME ZONE 'Europe/Lisbon',
        'ends_at', CASE WHEN t.ends_at IS NULL THEN NULL
                        ELSE (nxt AT TIME ZONE 'Europe/Lisbon') + (t.ends_at - t.starts_at) END,
        'series_generated', true,
        'attendee_count', NULL,
        'created_at', now(),
        'updated_at', now(),
        'last_seen_at', now()
      ))).*
      ON CONFLICT (source, source_event_id) DO NOTHING;
      IF FOUND THEN added := added + 1; END IF;
    END LOOP;
  END LOOP;
  RETURN added;
END;
$$;

-- Removes the upcoming dates SYNC generated for a series after a given moment,
-- used when a series is stopped or its frequency changes. Events collected from
-- a source or added by hand are never removed.
CREATE OR REPLACE FUNCTION public.clear_upcoming_series_dates(_series_key text, _after timestamptz)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admins only';
  END IF;
  DELETE FROM public.events
  WHERE series_key = _series_key AND series_generated AND starts_at > _after AND starts_at > now();
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.extend_event_series(text, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.clear_upcoming_series_dates(text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.extend_event_series(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_upcoming_series_dates(text, timestamptz) TO authenticated;

-- Keep every series six weeks ahead, before the morning collection runs.
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'sync-extend-series';
SELECT cron.schedule('sync-extend-series', '50 4 * * *', $$SELECT public.extend_event_series()$$);

-- Dance ------------------------------------------------------------------------
-- Dance is now its own interest. Upcoming events whose title names a dance style
-- move to it from Sports, Health & wellness, Music & live events or Arts & theatre.
UPDATE public.events
SET category = 'Dance'
WHERE starts_at > now()
  AND category IN ('Sports', 'Health & wellness', 'Music & live events', 'Arts & theatre', 'Social networking')
  AND lower(title) ~ '(salsa|bachata|kizomba|zouk|forr[oó]|tango|swing danc|lindy|west coast swing|dance social|social danc|dance class|dance night|dance party|ecstatic dance|contact improv|5rhythms|5 rhythms|ballroom|flamenco|hip ?hop dance|k-?pop dance|line danc|ceilidh|\mdance\M|\mdancing\M)';
