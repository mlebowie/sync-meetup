WITH rules(pos, pattern, label) AS (
  VALUES
    (1,  'pop-?up', 'Pop-up events'),
    (2,  'chess|trivia|quiz|board game|boardgame|gaming|video game|poker|dungeons', 'Games'),
    (3,  'volunteer|charity|non-?profit|ngo|fundrais|beach clean|clean-?up', 'Charity & non-profit'),
    (4,  'language exchange|languages|portuguese class|english class|conversation club|intercambio', 'Languages'),
    (5,  'church|faith|bible|christian|muslim|mosque|synagogue|religio', 'Religion'),
    (6,  'tennis|padel|football|soccer|futsal|basketball|volleyball|beach volley|run club|running club|jogging|marathon|\y5k\y|\y10k\y|bouldering|climbing|surf|skate|swimming|cycling|bike ride|martial arts|jiu-?jitsu|boxing|muay thai|rugby|golf|\ysports?\y', 'Sports'),
    (7,  'yoga|pilates|barre|hyrox|crossfit|bootcamp|calisthenic|nutrition|gym|fitness|wellness|wellbeing|well-?being|ice bath|cold plunge|sauna|spa day', 'Health & fitness'),
    (8,  'meditation|mindful|spiritual|reiki|astrolog|sound bath|sound healing|kirtan|tarot|retiro|retreat|chakra|kundalini|ecstatic dance|cacao|shamanic|breathwork|cuddle party', 'Spirituality'),
    (9,  'hike|hiking|trail|kayak|paddle ?board|nature walk|camping|outdoor|picnic|day trip|birdwatch|forest bathing|sunrise walk|sunset walk|caminhada|walking holiday|camino', 'Outdoors activities'),
    (10, ' ai |artificial intelligence|machine learning|tech|developer|software|coding|data|cyber|security|blockchain|robotic', 'Tech & AI'),
    (11, 'concert|live music|dj |salsa|bachata|kizomba|dance|dancing|band|gig|vinyl|jazz', 'Music & live events'),
    (12, 'comedy|stand-?up|theatre|theater|improv|art |arts|gallery|exhibition|painting|photograph|writing|film|cinema|book club|poetry', 'Arts & theatre'),
    (13, 'dinner|brunch|lunch|food|cooking|wine tasting|tasting|restaurant|supper|bbq|coffee', 'Dining & cooking'),
    (14, 'workshop|course|lecture|class|seminar|masterclass|talk|philosophy|learn', 'Education'),
    (15, 'founder|startup|entrepreneur|business|career|professional|conference|b2b|freelanc|coworking', 'Professional development'),
    (16, 'expat|nomad|international|cultur|heritage|museum|city tour', 'Cultural exchange')
),
matched AS (
  SELECT e.id,
         COALESCE(
           (SELECT r.label FROM rules r
             WHERE ' ' || lower(e.title) || ' ' ~ r.pattern
             ORDER BY r.pos LIMIT 1),
           (SELECT r.label FROM rules r
             WHERE ' ' || lower(e.title) || ' ' || lower(COALESCE(e.description, '')) || ' ' ~ r.pattern
             ORDER BY r.pos LIMIT 1),
           'Social networking'
         ) AS label
  FROM public.events e
)
UPDATE public.events e
SET category = m.label
FROM matched m
WHERE m.id = e.id AND e.category IS DISTINCT FROM m.label;