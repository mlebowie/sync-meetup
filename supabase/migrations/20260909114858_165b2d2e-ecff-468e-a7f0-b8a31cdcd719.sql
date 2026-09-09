WITH t AS (
  SELECT id, lower(coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(category,'') || ' ' || coalesce(array_to_string(tags,' '),'')) AS blob
  FROM public.events
)
UPDATE public.events e
SET category = CASE
  WHEN t.blob ~ 'pop-?up' THEN 'Pop-up events'
  WHEN t.blob ~ 'chess|trivia|quiz|board game|boardgame|gaming|video game|poker|dungeons' THEN 'Games'
  WHEN t.blob ~ 'volunteer|charity|non-?profit|ngo|fundrais|beach clean|clean-?up' THEN 'Charity & non-profit'
  WHEN t.blob ~ 'language exchange|languages|portuguese class|english class|conversation club|intercambio' THEN 'Languages'
  WHEN t.blob ~ 'church|faith|bible|christian|muslim|mosque|synagogue|religio' THEN 'Religion'
  WHEN t.blob ~ 'meditation|breathwork|mindful|spiritual|reiki|astrolog|sound bath|tarot' THEN 'Spirituality'
  WHEN t.blob ~ 'yoga|pilates|wellness|health|fitness|gym|crossfit|bootcamp|nutrition' THEN 'Health & fitness'
  WHEN t.blob ~ 'tennis|padel|football|soccer|basketball|volleyball|run club|running|climb|surf|swim|cycling|bike ride|martial arts|sports' THEN 'Sports'
  WHEN t.blob ~ 'hike|hiking|trail|kayak|nature walk|camping|outdoor|picnic|day trip' THEN 'Outdoors activities'
  WHEN t.blob ~ ' ai |artificial intelligence|machine learning|tech|developer|software|coding|data|cyber|security|blockchain|robotic' THEN 'Tech & AI'
  WHEN t.blob ~ 'concert|live music|dj |salsa|bachata|kizomba|dance|dancing|band|gig|vinyl|jazz|festival de m' THEN 'Music & live events'
  WHEN t.blob ~ 'comedy|stand-?up|theatre|theater|improv|art |arts|gallery|exhibition|painting|photograph|writing|film|cinema|book club|poetry' THEN 'Arts & theatre'
  WHEN t.blob ~ 'dinner|brunch|lunch|food|cooking|wine tasting|tasting|restaurant|supper|bbq|coffee' THEN 'Dining & cooking'
  WHEN t.blob ~ 'workshop|course|lecture|class|seminar|masterclass|talk|philosophy|learn' THEN 'Education'
  WHEN t.blob ~ 'founder|startup|entrepreneur|business|career|professional|conference|b2b|freelanc|coworking' THEN 'Professional development'
  WHEN t.blob ~ 'expat|nomad|international|cultur|heritage|museum|city tour' THEN 'Cultural exchange'
  ELSE 'Social networking'
END,
updated_at = now()
FROM t
WHERE t.id = e.id;