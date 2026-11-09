-- The same listing was sometimes collected twice (eventbrite.pt vs .com, lu.ma vs
-- luma.com). Keep one event per title per day: published or hidden events always
-- win, otherwise the oldest copy. Only Waiting copies are ever removed.
WITH ranked AS (
  SELECT id,
         review_status,
         row_number() OVER (
           PARTITION BY lower(regexp_replace(title, '[^a-zA-Z0-9]+', ' ', 'g')),
                        (starts_at AT TIME ZONE 'Europe/Lisbon')::date
           ORDER BY (review_status <> 'pending') DESC, created_at
         ) AS n
  FROM public.events
  WHERE starts_at > now()
)
DELETE FROM public.events e
USING ranked r
WHERE e.id = r.id AND r.n > 1 AND r.review_status = 'pending';
