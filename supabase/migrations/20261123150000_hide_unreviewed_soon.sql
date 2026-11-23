-- Waiting events that were not reviewed at least 24 hours before they start are
-- hidden, so the queue only holds events that can still be published in time.
CREATE OR REPLACE FUNCTION public.hide_unreviewed_soon()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE public.events
  SET review_status = 'rejected',
      review_note = 'Not reviewed 24 hours before it started',
      updated_at = now()
  WHERE review_status = 'pending'
    AND starts_at < now() + interval '24 hours';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.hide_unreviewed_soon() FROM PUBLIC, anon, authenticated;

-- Every hour, and once now.
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'sync-hide-unreviewed-soon';
SELECT cron.schedule('sync-hide-unreviewed-soon', '0 * * * *', $$SELECT public.hide_unreviewed_soon()$$);
SELECT public.hide_unreviewed_soon();
