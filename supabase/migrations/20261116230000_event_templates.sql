-- Published descriptions to reuse ---------------------------------------------
-- Organisers such as Dinnersmate Porto relist the same dinner every week, and
-- each new date arrives in Waiting with the platform's raw text. Every event a
-- curator publishes is saved here (one row per organiser and title), so later
-- dates can start from the wording that was published, even after the old
-- dates have passed and been removed from events.
CREATE TABLE IF NOT EXISTS public.event_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Organiser and title in lower case, letters and digits only (match_key), for matching.
  organizer_key text NOT NULL,
  title_key text NOT NULL,
  organizer_name text,
  title text NOT NULL,
  series_key text,
  description text NOT NULL,
  category text,
  organizer_bio text,
  image_url text,
  price_label text,
  women_only boolean NOT NULL DEFAULT false,
  lgbtq_friendly boolean NOT NULL DEFAULT false,
  pet_friendly boolean NOT NULL DEFAULT false,
  last_event_id uuid,
  last_starts_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organizer_key, title_key)
);
CREATE INDEX IF NOT EXISTS event_templates_organizer_idx ON public.event_templates (organizer_key);
ALTER TABLE public.event_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage event templates" ON public.event_templates;
CREATE POLICY "Admins manage event templates" ON public.event_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.match_key(_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(regexp_replace(lower(coalesce(_text, '')), '[^a-z0-9]+', ' ', 'g'));
$$;

-- Saves a published event's wording as the template for its organiser and title.
CREATE OR REPLACE FUNCTION public.save_event_template()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.event_templates AS t (
    organizer_key, title_key, organizer_name, title, series_key, description, category,
    organizer_bio, image_url, price_label, women_only, lgbtq_friendly, pet_friendly,
    last_event_id, last_starts_at, updated_at)
  VALUES (
    public.match_key(NEW.organizer_name), public.match_key(NEW.title), NEW.organizer_name, NEW.title,
    NEW.series_key, NEW.description, NEW.category, nullif(NEW.organizer_bio, ''), NEW.image_url,
    NEW.price_label, coalesce(NEW.women_only, false), coalesce(NEW.lgbtq_friendly, false),
    coalesce(NEW.pet_friendly, false), NEW.id, NEW.starts_at, now())
  ON CONFLICT (organizer_key, title_key) DO UPDATE SET
    organizer_name = EXCLUDED.organizer_name,
    title = EXCLUDED.title,
    series_key = coalesce(EXCLUDED.series_key, t.series_key),
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    organizer_bio = coalesce(EXCLUDED.organizer_bio, t.organizer_bio),
    image_url = coalesce(EXCLUDED.image_url, t.image_url),
    price_label = EXCLUDED.price_label,
    women_only = EXCLUDED.women_only,
    lgbtq_friendly = EXCLUDED.lgbtq_friendly,
    pet_friendly = EXCLUDED.pet_friendly,
    last_event_id = EXCLUDED.last_event_id,
    last_starts_at = EXCLUDED.last_starts_at,
    updated_at = now();
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS events_save_template ON public.events;
CREATE TRIGGER events_save_template
  AFTER INSERT OR UPDATE OF review_status, reviewed_at, title, description, category, organizer_name,
    organizer_bio, image_url, price_label, women_only, lgbtq_friendly, pet_friendly
  ON public.events
  FOR EACH ROW
  WHEN (NEW.review_status = 'approved' AND NEW.reviewed_at IS NOT NULL
        AND coalesce(NEW.description, '') <> '' AND coalesce(NEW.organizer_name, '') <> '')
  EXECUTE FUNCTION public.save_event_template();

-- Everything already published becomes a template (latest date wins).
INSERT INTO public.event_templates (
  organizer_key, title_key, organizer_name, title, series_key, description, category,
  organizer_bio, image_url, price_label, women_only, lgbtq_friendly, pet_friendly,
  last_event_id, last_starts_at)
SELECT DISTINCT ON (public.match_key(organizer_name), public.match_key(title))
  public.match_key(organizer_name), public.match_key(title), organizer_name, title, series_key,
  description, category, nullif(organizer_bio, ''), image_url, price_label,
  coalesce(women_only, false), coalesce(lgbtq_friendly, false), coalesce(pet_friendly, false),
  id, starts_at
FROM public.events
WHERE review_status = 'approved' AND reviewed_at IS NOT NULL
  AND coalesce(description, '') <> '' AND coalesce(organizer_name, '') <> ''
ORDER BY public.match_key(organizer_name), public.match_key(title), starts_at DESC
ON CONFLICT (organizer_key, title_key) DO NOTHING;

-- Events already waiting: the same series or title from the same organiser takes
-- the published wording; other events from an organiser with published events
-- get a note pointing to them.
WITH matched AS (
  SELECT DISTINCT ON (e.id) e.id AS event_id, t.title, t.description, t.category, t.organizer_bio,
         t.image_url, t.women_only, t.lgbtq_friendly, t.pet_friendly
  FROM public.events e
  JOIN public.event_templates t
    ON t.organizer_key = public.match_key(e.organizer_name)
   AND (t.title_key = public.match_key(e.title) OR (e.series_key IS NOT NULL AND t.series_key = e.series_key))
  WHERE e.review_status = 'pending' AND e.reviewed_at IS NULL AND e.starts_at > now()
    AND coalesce(e.organizer_name, '') <> ''
  ORDER BY e.id, t.updated_at DESC
)
UPDATE public.events e SET
  description = m.description,
  category = coalesce(m.category, e.category),
  organizer_bio = coalesce(nullif(e.organizer_bio, ''), m.organizer_bio),
  image_url = coalesce(e.image_url, m.image_url),
  women_only = coalesce(e.women_only, false) OR m.women_only,
  lgbtq_friendly = coalesce(e.lgbtq_friendly, false) OR m.lgbtq_friendly,
  pet_friendly = coalesce(e.pet_friendly, false) OR m.pet_friendly,
  review_note = 'Description copied from the published "' || m.title || '"; check the details',
  updated_at = now()
FROM matched m
WHERE e.id = m.event_id;

UPDATE public.events e SET
  review_note = e.organizer_name || ' has published events; Edit → Published descriptions to reuse one',
  updated_at = now()
WHERE e.review_status = 'pending' AND e.reviewed_at IS NULL AND e.starts_at > now()
  AND e.review_note IS NULL
  AND coalesce(e.organizer_name, '') <> ''
  AND EXISTS (SELECT 1 FROM public.event_templates t WHERE t.organizer_key = public.match_key(e.organizer_name));
