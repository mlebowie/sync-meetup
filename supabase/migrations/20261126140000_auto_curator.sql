-- Automatic curator -----------------------------------------------------------------
-- The auto-curate function reviews Waiting events against their pages. It starts in
-- test mode: decisions are recorded in curator_decisions and no event changes.
-- Emilie switches it on with:
--   update curator_settings set mode = 'live' where id = 1;
-- and back to test mode with mode = 'test'.

CREATE TABLE IF NOT EXISTS public.curator_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  mode text NOT NULL DEFAULT 'test' CHECK (mode IN ('test', 'live')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.curator_settings (id, mode) VALUES (1, 'test') ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.curator_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage curator settings" ON public.curator_settings;
CREATE POLICY "Admins manage curator settings" ON public.curator_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Every decision, in test and live mode, with what the event looked like before
-- and what the curator would set.
CREATE TABLE IF NOT EXISTS public.curator_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  event_id uuid,
  live boolean NOT NULL DEFAULT false,
  action text NOT NULL,
  note text,
  title text,
  source_url text,
  before jsonb,
  after jsonb,
  ai_review jsonb,
  page_facts jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS curator_decisions_run_idx ON public.curator_decisions (run_id);
ALTER TABLE public.curator_decisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read curator decisions" ON public.curator_decisions;
CREATE POLICY "Admins read curator decisions" ON public.curator_decisions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- When the curator last looked at an event, and when it published one itself.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS auto_checked_at timestamptz;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS auto_published_at timestamptz;

-- Calls the function the same way the collector is called.
CREATE OR REPLACE FUNCTION public.run_auto_curator(_test boolean DEFAULT false)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'sync_project_url') || '/functions/v1/auto-curate',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'sync_service_role_key')
    ),
    body := jsonb_build_object('test', _test),
    timeout_milliseconds := 150000
  );
$$;
REVOKE EXECUTE ON FUNCTION public.run_auto_curator(boolean) FROM PUBLIC, anon, authenticated;

-- No schedule yet: it runs by hand until Emilie has checked the test results.
-- Once she has, schedule it after the morning collection:
--   select cron.schedule('sync-auto-curate', '*/20 6-8 * * *', $$select public.run_auto_curator()$$);
