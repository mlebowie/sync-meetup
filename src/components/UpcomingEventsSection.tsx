import { RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { Event, Participant, Vibe } from '@/types/event';
import { VIBES } from '@/lib/vibe';
import { CITY_NEIGHBORHOODS } from '@/lib/onboardingData';
import { UserProfile } from '@/lib/userProfile';
import { FeedFilters, applyFeedFilters, scopeName } from '@/lib/feedFilters';
import ExpandableEventGrid from './ExpandableEventGrid';
import FilterTour, { TourStep } from './FilterTour';
import { START_FILTER_TOUR_EVENT, setFilterTourState } from '@/lib/filterTour';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { TypeaheadSelect } from './TypeaheadSelect';
import { useSearch } from '@/context/SearchContext';
import { searchEvents } from '@/lib/search';
import { MapPin, Zap, Ruler, CalendarRange, HelpCircle, Search, X, SlidersHorizontal, ChevronDown } from 'lucide-react';

interface Props {
  events: Event[];
  profile: UserProfile;
  /** The home feed's shared filters (interests, time, size, inclusivity) from the pinned bar. */
  filters: FeedFilters;
  profileInterests: string[];
  hideCategory?: boolean;
  /** Parts of the pinned bar the filter tour points at. */
  barInterestsRef: RefObject<HTMLElement>;
  barInclusivityRef: RefObject<HTMLElement>;
  onAttend: (id: string) => void;
  onParticipantClick?: (p: Participant) => void;
  onOpenGroupChat?: (e: Event) => void;
}

const eventAvgAge = (id: string) => {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 22 + (h % 25); // 22-46
};
const eventDistance = (id: string) => {
  let h = 0;
  for (const c of id) h = (h * 17 + c.charCodeAt(0)) >>> 0;
  return 0.5 + ((h % 90) / 10);
};

const DEFAULT_AGE: [number, number] = [22, 45];
const DEFAULT_DISTANCE = 15;

const UpcomingEventsSection = ({
  events,
  profile,
  filters,
  profileInterests,
  hideCategory = false,
  barInterestsRef,
  barInclusivityRef,
  onAttend,
  onParticipantClick,
  onOpenGroupChat,
}: Props) => {
  const { query, setQuery } = useSearch();
  const neighborhoods = CITY_NEIGHBORHOODS[profile.location] ?? CITY_NEIGHBORHOODS['Porto'];

  // Finer filters that only this list needs. The shared ones live in the pinned bar.
  const [neighborhood, setNeighborhood] = useState<string>('');
  const [vibe, setVibe] = useState<Vibe[]>([]);
  const [ageRange, setAgeRange] = useState<[number, number]>(DEFAULT_AGE);
  const [maxDistance, setMaxDistance] = useState<number>(DEFAULT_DISTANCE);
  const [moreOpen, setMoreOpen] = useState(false);

  // --- First-run tutorial ---------------------------------------------------
  const vibeRef = useRef<HTMLDivElement>(null);
  const placeRef = useRef<HTMLDivElement>(null);
  const [tourOpen, setTourOpen] = useState(false);

  const startTour = () => {
    setMoreOpen(true);
    setTourOpen(true);
  };

  useEffect(() => {
    window.addEventListener(START_FILTER_TOUR_EVENT, startTour);
    return () => window.removeEventListener(START_FILTER_TOUR_EVENT, startTour);
  }, []);

  const tourSteps: TourStep[] = [
    {
      title: 'Your interests sit in the bar at the top',
      body: 'They come from your profile and stay pinned as you scroll. Tap one to narrow every section of your feed, All to see everything you follow, or More to browse other categories.',
      ref: barInterestsRef,
    },
    {
      title: 'Choose how the room should feel',
      body: 'Vibe sets the social energy, from a chill coffee to a lively rooftop. Group size lives in the bar at the top.',
      ref: vibeRef,
    },
    {
      title: 'Keep it close to home',
      body: `We show events closest to your neighborhood first. Tighten the radius for things you can walk to, and set the age range of who you'll meet.`,
      ref: placeRef,
    },
    {
      title: 'Only show spaces that fit you',
      body: 'Women only, LGBTQ+ friendly and pet friendly in the bar narrow the whole feed to events built with those in mind. Change any of this any time and your feed updates instantly.',
      ref: barInclusivityRef,
    },
  ];

  const resetFilters = () => {
    setNeighborhood('');
    setVibe([]);
    setAgeRange(DEFAULT_AGE);
    setMaxDistance(DEFAULT_DISTANCE);
  };

  const moreCount =
    (neighborhood ? 1 : 0) +
    vibe.length +
    (ageRange[0] !== DEFAULT_AGE[0] || ageRange[1] !== DEFAULT_AGE[1] ? 1 : 0) +
    (maxDistance !== DEFAULT_DISTANCE ? 1 : 0);

  const toggleVibe = (v: Vibe) => setVibe(list => (list.includes(v) ? list.filter(x => x !== v) : [...list, v]));

  const neighborhoodOptions = useMemo(
    () => neighborhoods.map(n => ({ value: n, label: n, searchText: n })),
    [neighborhoods]
  );

  const filtered = useMemo(() => {
    const nbq = neighborhood.trim().toLowerCase();
    const list = applyFeedFilters(events, filters, profileInterests).filter(e => {
      if (nbq && !e.location.toLowerCase().includes(nbq)) return false;
      if (vibe.length > 0 && !vibe.includes(e.vibe)) return false;
      const age = eventAvgAge(e.id);
      if (age < ageRange[0] || age > ageRange[1]) return false;
      if (eventDistance(e.id) > maxDistance) return false;
      if (query.trim() && searchEvents([e], query).length === 0) return false;
      return true;
    });

    // Closest to the chosen neighborhood first.
    return [...list].sort((a, b) => eventDistance(a.id) - eventDistance(b.id));
  }, [events, filters, profileInterests, neighborhood, vibe, ageRange, maxDistance, query]);

  const pill = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
      active ? 'bg-primary text-primary-foreground shadow-button' : 'bg-muted text-muted-foreground hover:bg-muted/80'
    }`;

  return (
    <section id="upcoming" className="py-10 md:py-14 scroll-mt-32">
      <div className="container px-4 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Upcoming events</h2>
            <p className="text-muted-foreground mt-1">Everything coming up in {scopeName(filters)}.</p>
          </div>
          <button
            onClick={startTour}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <HelpCircle className="h-4 w-4" />
            How filters work
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          {/* Search field — filters the list live, stays in sync with the header search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search events, locations, organizers…"
              className="pl-9 pr-9"
              aria-label="Search events"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => setMoreOpen(v => !v)}
            aria-expanded={moreOpen}
            aria-controls="upcoming-more-filters"
            className="shrink-0"
          >
            <SlidersHorizontal className="h-4 w-4 mr-1.5" />
            More filters
            {moreCount > 0 && (
              <span className="ml-1.5 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                {moreCount}
              </span>
            )}
            <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {moreOpen && (
          <div id="upcoming-more-filters" className="bg-card rounded-2xl shadow-card p-5 md:p-6 mb-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Vibe */}
              <div ref={vibeRef} className="rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-accent-strong" />
                  <span className="text-sm font-semibold">Vibe</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">The social energy in the room, from relaxed to loud.</p>
                <div className="flex flex-wrap gap-2">
                  {VIBES.map(v => (
                    <button key={v.value} title={v.description} onClick={() => toggleVibe(v.value)} className={pill(vibe.includes(v.value))}>
                      {v.emoji} {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Neighborhood typeahead */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="h-4 w-4 text-danger" />
                  <span className="text-sm font-semibold">Neighborhood</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">Anchor your feed to one part of the city.</p>
                <TypeaheadSelect
                  value={neighborhood}
                  onChange={setNeighborhood}
                  options={neighborhoodOptions}
                  placeholder="Type to filter (e.g. Cedofeita)"
                  allowFreeText
                />
              </div>
            </div>

            {/* Place & people: age + distance */}
            <div ref={placeRef} className="grid grid-cols-1 md:grid-cols-2 gap-6 rounded-xl">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <CalendarRange className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Age range of attendees</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{ageRange[0]}–{ageRange[1]} years old</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Roughly who else will be there.</p>
                <Slider
                  min={18}
                  max={65}
                  step={1}
                  minStepsBetweenThumbs={1}
                  value={ageRange}
                  onValueChange={v => setAgeRange([v[0], v[1]] as [number, number])}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-success" />
                    <span className="text-sm font-semibold">Distance from event</span>
                  </div>
                  <span className="text-sm text-muted-foreground">≤ {maxDistance.toFixed(1)} km</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Closest events to {neighborhood || profile.neighborhood || 'your neighborhood'} are always shown first.
                </p>
                <Slider
                  min={1}
                  max={20}
                  step={0.5}
                  value={[maxDistance]}
                  onValueChange={v => setMaxDistance(v[0])}
                />
              </div>
            </div>

            {moreCount > 0 && (
              <div className="flex justify-end pt-2 border-t border-border">
                <Button variant="ghost" onClick={resetFilters}>
                  Reset these filters
                </Button>
              </div>
            )}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold mb-2">No matches yet</h3>
            <p className="text-muted-foreground mb-4">Loosen a filter here or in the bar at the top and try again.</p>
            {moreCount > 0 && <Button variant="outline" onClick={resetFilters}>Reset these filters</Button>}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <p className="text-sm text-muted-foreground">
                {query.trim() ? `Results for “${query}” — ` : ''}Showing {filtered.length} of {events.length} events
              </p>
              {query.trim() && (
                <Button variant="ghost" size="sm" onClick={() => setQuery('')}>Clear search</Button>
              )}
            </div>
            <ExpandableEventGrid
              events={filtered}
              hideCategory={hideCategory}
              initialCount={query.trim() ? filtered.length : 3}
              onAttend={onAttend}
              onParticipantClick={onParticipantClick}
              onOpenGroupChat={onOpenGroupChat}
            />
          </>
        )}
      </div>

      <FilterTour
        open={tourOpen}
        steps={tourSteps}
        onClose={(reason) => {
          setTourOpen(false);
          setFilterTourState(reason);
        }}
      />
    </section>
  );
};

export default UpcomingEventsSection;
