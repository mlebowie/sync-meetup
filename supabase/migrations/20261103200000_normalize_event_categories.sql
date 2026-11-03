-- Event categories now use exactly the interest labels from onboarding, so the
-- pill on a card always matches a filter. Rename older labels in place.

-- "Sports & fitness" covered both; yoga-type sessions move under wellness.
UPDATE public.events
SET category = 'Health & wellness'
WHERE lower(category) = 'sports & fitness'
  AND lower(title) ~ 'yoga|pilates|breathwork|wellness|wellbeing|meditation|mindful|barre|gym|fitness';

UPDATE public.events
SET category = CASE lower(category)
  WHEN 'health & fitness' THEN 'Health & wellness'
  WHEN 'wellness' THEN 'Health & wellness'
  WHEN 'fitness' THEN 'Health & wellness'
  WHEN 'sports & fitness' THEN 'Sports'
  WHEN 'outdoors' THEN 'Outdoors activities'
  WHEN 'social' THEN 'Social networking'
  WHEN 'networking' THEN 'Social networking'
  WHEN 'community' THEN 'Social networking'
  WHEN 'professional' THEN 'Professional development'
  WHEN 'food & drinks' THEN 'Dining & cooking'
  WHEN 'music' THEN 'Music & live events'
  WHEN 'arts' THEN 'Arts & theatre'
  WHEN 'arts & culture' THEN 'Arts & theatre'
  WHEN 'tech' THEN 'Tech & AI'
  ELSE category
END
WHERE lower(category) IN (
  'health & fitness', 'wellness', 'fitness', 'sports & fitness', 'outdoors', 'social',
  'networking', 'community', 'professional', 'food & drinks', 'music', 'arts',
  'arts & culture', 'tech'
);

-- Anything still outside the onboarding list (or empty) falls back to Social networking.
UPDATE public.events
SET category = 'Social networking'
WHERE category IS NULL OR category NOT IN (
  'Sports', 'Social networking', 'Dining & cooking', 'Pop-up events', 'Outdoors activities',
  'Tech & AI', 'Arts & theatre', 'Games', 'Health & wellness', 'Religion', 'Spirituality',
  'Music & live events', 'Professional development', 'Education', 'Languages',
  'Cultural exchange', 'Charity & non-profit'
);
