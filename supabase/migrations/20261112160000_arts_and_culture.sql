-- "Arts & theatre" is now "Arts & culture", so books, photography, film and
-- museums clearly belong. Every event, past and future, takes the new label.
UPDATE public.events SET category = 'Arts & culture' WHERE category = 'Arts & theatre';

-- Book clubs, reading and writing groups, and photo walks are Arts & culture,
-- whatever they were labelled before (often Outdoors or Cultural exchange).
UPDATE public.events
SET category = 'Arts & culture'
WHERE category IS DISTINCT FROM 'Arts & culture'
  AND lower(title || ' ' || coalesce(description, '')) ~
    '(book club|book ?swap|reading (group|club|circle)|silent reading|readers''? (club|meetup)|writers''? (club|circle|group|meetup)|writing (club|circle|group)|photo ?walk|photography (walk|meetup|club|tour)|photowalk|street photography)';
