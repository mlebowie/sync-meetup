-- Partner submission links ------------------------------------------------------
-- Each partner gets a private link (/submit/<submit_token>) to add their own events.
-- What they send lands in Waiting as a SYNC partner event; nothing is published
-- until Emilie approves it. A link can be switched off (submit_enabled) or
-- replaced (a new token) at any time.

ALTER TABLE public.partner_organisers ADD COLUMN IF NOT EXISTS submit_token text UNIQUE;
ALTER TABLE public.partner_organisers ADD COLUMN IF NOT EXISTS submit_enabled boolean NOT NULL DEFAULT true;
-- Founders Running Club and Unseen Connection have their copies from other sites
-- merged into one card a day. Partners who may run two events in one day
-- (Porto AI Week, Porto Yoga Club) must not, so it is a per-partner choice.
ALTER TABLE public.partner_organisers ADD COLUMN IF NOT EXISTS auto_merge boolean NOT NULL DEFAULT false;
UPDATE public.partner_organisers SET auto_merge = true WHERE name IN ('Founders Running Club', 'Unseen Connection');

-- A readable, hard-to-guess link: the partner's name, then six random characters.
CREATE OR REPLACE FUNCTION public.new_submit_token(_name text)
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT left(trim(both '-' from regexp_replace(lower(_name), '[^a-z0-9]+', '-', 'g')), 30)
         || '-' || substr(md5(gen_random_uuid()::text), 1, 6);
$$;

-- The partners in the SYNC Partners sheet.
INSERT INTO public.partner_organisers (name, match, bio) VALUES
  ('Expat Girls Porto', 'expat[[:space:]]*girls', 'Expat Girls Porto is a community for women in Porto, expats and locals alike, that runs brunches, dinners, drinks, workshops, tastings and active meetups each month. Events are in English.'),
  ('Keep Shining Jewellery', 'keep[[:space:]]*shining', NULL),
  ('Porto Yoga Club', 'porto[[:space:]]*yoga[[:space:]]*club', NULL),
  ('Porto AI Week', 'porto[[:space:]]*ai[[:space:]]*week', NULL),
  ('Nomad World', 'nomad[[:space:]]*world', NULL),
  ('Another Porto', 'another[[:space:]]*porto', NULL),
  ('SYNC × Workin Matosinhos', 'workin', NULL),
  ('Fisga', 'fisga', 'Fisga runs coworking spaces in Porto, and its Warehouse on Rua de Santos Pousada hosts community events: chef-takeover lunches, film nights with food pop-ups and a book club.')
ON CONFLICT (name) DO NOTHING;
UPDATE public.partner_organisers SET submit_token = public.new_submit_token(name) WHERE submit_token IS NULL;

-- Events a partner sent through their link.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES public.partner_organisers(id) ON DELETE SET NULL;

-- Only partners marked auto_merge have other sites' copies merged (see above).
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

  FOR p IN SELECT * FROM public.partner_organisers WHERE auto_merge LOOP
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
