-- Partner organisers ------------------------------------------------------------
-- Organisers who partner with SYNC. Their events show the SYNC Partner badge
-- instead of the platform they were collected from, the Register button goes to
-- the partner's own sign-up page (their Luma, for example), and the card offers
-- their WhatsApp group. Several copies of one partner event (Luma, Meetup,
-- Eventbrite) become a single card.
CREATE TABLE IF NOT EXISTS public.partner_organisers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  -- Case-insensitive regular expression matched against an event's organiser and title.
  match text NOT NULL,
  register_url text,
  whatsapp_url text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_organisers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage partner organisers" ON public.partner_organisers;
CREATE POLICY "Admins manage partner organisers" ON public.partner_organisers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS register_url text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS whatsapp_url text;
-- Other pages listing the same event (collected from another platform).
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS also_on text[] NOT NULL DEFAULT '{}';

-- Records that an event is also listed elsewhere, instead of a second card.
CREATE OR REPLACE FUNCTION public.add_event_also_on(_id uuid, _url text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.events
  SET also_on = array_append(also_on, _url)
  WHERE id = _id AND _url IS NOT NULL AND NOT (_url = ANY (also_on)) AND _url <> source_url;
$$;
REVOKE EXECUTE ON FUNCTION public.add_event_also_on(uuid, text) FROM PUBLIC, anon, authenticated;

-- Applies every partner to upcoming events: badge, links and bio, then keeps one
-- card per partner per day. The card kept is the published one if any, else the
-- Luma copy, then Meetup, then Eventbrite, then the oldest. Other copies that are
-- still waiting are hidden and listed in the kept card's also_on.
CREATE OR REPLACE FUNCTION public.apply_partner_organisers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.partner_organisers;
  touched integer := 0;
  n integer;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admins only';
  END IF;

  FOR p IN SELECT * FROM public.partner_organisers LOOP
    UPDATE public.events e SET
      tags = CASE WHEN 'sync-partner' = ANY (coalesce(e.tags, '{}')) THEN e.tags
                  ELSE array_append(coalesce(e.tags, '{}'), 'sync-partner') END,
      organizer_name = p.name,
      organizer_bio = coalesce(nullif(e.organizer_bio, ''), p.bio),
      register_url = coalesce(p.register_url, e.register_url),
      whatsapp_url = coalesce(p.whatsapp_url, e.whatsapp_url),
      updated_at = now()
    WHERE e.starts_at > now() - interval '1 day'
      AND e.review_status <> 'rejected'
      AND (coalesce(e.organizer_name, '') ~* p.match OR e.title ~* p.match)
      AND (e.organizer_name IS DISTINCT FROM p.name
           OR NOT ('sync-partner' = ANY (coalesce(e.tags, '{}')))
           OR e.register_url IS DISTINCT FROM coalesce(p.register_url, e.register_url)
           OR e.whatsapp_url IS DISTINCT FROM coalesce(p.whatsapp_url, e.whatsapp_url)
           OR (nullif(e.organizer_bio, '') IS NULL AND p.bio IS NOT NULL));
    GET DIAGNOSTICS n = ROW_COUNT;
    touched := touched + n;

    WITH ranked AS (
      SELECT id, source_url, review_status,
             (starts_at AT TIME ZONE 'Europe/Lisbon')::date AS day,
             row_number() OVER (
               PARTITION BY (starts_at AT TIME ZONE 'Europe/Lisbon')::date
               ORDER BY (review_status = 'approved') DESC,
                        CASE source WHEN 'luma' THEN 0 WHEN 'meetup' THEN 1 WHEN 'eventbrite' THEN 2 ELSE 3 END,
                        created_at
             ) AS rk
      FROM public.events
      WHERE organizer_name = p.name AND starts_at > now() AND review_status <> 'rejected'
    ), keep AS (
      SELECT day, id FROM ranked WHERE rk = 1
    ), dropped AS (
      UPDATE public.events e
      SET review_status = 'rejected', reviewed_at = now(),
          review_note = 'Duplicate of the ' || p.name || ' card for this day', updated_at = now()
      FROM ranked r
      WHERE e.id = r.id AND r.rk > 1 AND r.review_status = 'pending'
      RETURNING r.day, r.source_url
    )
    UPDATE public.events e
    SET also_on = (SELECT array_agg(DISTINCT u) FROM unnest(e.also_on || array_agg_urls.urls) u WHERE u <> e.source_url)
    FROM (SELECT k.id, array_agg(d.source_url) AS urls FROM dropped d JOIN keep k USING (day) GROUP BY k.id) array_agg_urls
    WHERE e.id = array_agg_urls.id;
    GET DIAGNOSTICS n = ROW_COUNT;
    touched := touched + n;
  END LOOP;
  RETURN touched;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.apply_partner_organisers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_partner_organisers() TO authenticated;

-- First partner. Its Luma and WhatsApp links are added once Emilie shares them:
--   update partner_organisers set register_url = '…', whatsapp_url = '…' where name = 'Founders Running Club';
--   select apply_partner_organisers();
INSERT INTO public.partner_organisers (name, match)
VALUES ('Founders Running Club', 'founders?[[:space:]]*run(ning)?[[:space:]]*club')
ON CONFLICT (name) DO NOTHING;

-- Re-apply partners every morning after the collector has run.
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'sync-apply-partners';
SELECT cron.schedule('sync-apply-partners', '15 6 * * *', $$SELECT public.apply_partner_organisers()$$);

SELECT public.apply_partner_organisers();
