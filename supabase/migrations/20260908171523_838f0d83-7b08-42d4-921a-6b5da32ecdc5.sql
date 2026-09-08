CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('eventbrite','meetup','luma')),
  source_event_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE,
  time_label TEXT,
  venue_name TEXT,
  location TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  image_url TEXT,
  organizer_name TEXT,
  organizer_url TEXT,
  category TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  price_label TEXT,
  attendee_count INTEGER,
  capacity INTEGER,
  recurrence TEXT NOT NULL DEFAULT 'one-off' CHECK (recurrence IN ('weekly','biweekly','monthly','one-off')),
  series_key TEXT,
  activity_level TEXT CHECK (activity_level IN ('low','moderate','high')),
  intensity TEXT CHECK (intensity IN ('chill','social','energetic')),
  group_size TEXT CHECK (group_size IN ('small','medium','large')),
  women_only BOOLEAN NOT NULL DEFAULT false,
  lgbtq_friendly BOOLEAN NOT NULL DEFAULT false,
  pet_friendly BOOLEAN NOT NULL DEFAULT false,
  classified BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (source, source_event_id)
);

CREATE INDEX events_starts_at_idx ON public.events (starts_at);
CREATE INDEX events_classified_idx ON public.events (classified);

GRANT SELECT ON public.events TO anon;
GRANT SELECT ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are publicly readable"
ON public.events FOR SELECT
USING (true);

CREATE TABLE public.event_scrape_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed','paused')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  lease_until TIMESTAMP WITH TIME ZONE,
  paused_reason TEXT,
  source_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  events_upserted INTEGER NOT NULL DEFAULT 0,
  error_details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.event_scrape_runs TO anon;
GRANT SELECT ON public.event_scrape_runs TO authenticated;
GRANT ALL ON public.event_scrape_runs TO service_role;

ALTER TABLE public.event_scrape_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scrape runs are publicly readable"
ON public.event_scrape_runs FOR SELECT
USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_event_scrape_runs_updated_at
BEFORE UPDATE ON public.event_scrape_runs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();