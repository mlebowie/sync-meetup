import { useMemo, useState } from 'react';
import { Event, Participant } from '@/types/event';
import { withSampleDate } from '@/lib/sampleDates';
import { useEvents } from '@/context/EventsContext';
import ExpandableEventGrid from './ExpandableEventGrid';
import EventCarousel from './EventCarousel';
import SectionFilterBar, { SectionFilters, defaultSectionFilters, applySectionFilters } from './SectionFilterBar';
import { matchesInterests } from '@/lib/userProfile';
import { FeedFilters, applyFeedFilters } from '@/lib/feedFilters';
import { TrendingUp, Clock } from 'lucide-react';


interface Props {
  onAttend: (id: string) => void;
  onParticipantClick?: (p: Participant) => void;
  onOpenGroupChat?: (event: Event) => void;
  guest?: boolean;
  interests?: string[];
  /** The home feed's shared filters. When given, the section follows them instead of its own chips. */
  feedFilters?: FeedFilters;
  hideCategory?: boolean;
}

// Spread trending one-off events across the next 7–14 days.
const TRENDING_OFFSETS = [3, 5, 7, 10, 12, 14, 16, 18, 20, 22].map(d => d * 24 * 60 * 60 * 1000);

const PopularTrendingSection = ({ onAttend, onParticipantClick, onOpenGroupChat, guest = false, interests = [], feedFilters, hideCategory = false }: Props) => {
  const { events: mockEvents } = useEvents();
  const trendingEvents: Event[] = useMemo(() => {
    const now = Date.now();
    const oneOffs = mockEvents.filter(e => e.recurrence === 'one-off');
    // With the shared feed bar, interests come from the bar ("All" = the user's own).
    const pool = feedFilters ? oneOffs : oneOffs.filter(e => matchesInterests(e, interests));
    return pool.slice(0, 13).map((e, i) => withSampleDate(e, now + TRENDING_OFFSETS[i % TRENDING_OFFSETS.length]));
  }, [mockEvents, interests, feedFilters]);

  const [filters, setFilters] = useState<SectionFilters>(defaultSectionFilters);
  const [showAll, setShowAll] = useState(false);
  const visible = useMemo(() => {
    if (!feedFilters) return applySectionFilters(trendingEvents, filters);
    // Most popular first, within whatever the feed is filtered to.
    return [...applyFeedFilters(trendingEvents, feedFilters, interests)].sort(
      (a, b) => b.currentParticipants - a.currentParticipants,
    );
  }, [trendingEvents, filters, feedFilters, interests]);

  if (trendingEvents.length === 0) return null;

  return (
    <section className="py-10 md:py-14 bg-gradient-to-b from-accent/5 via-primary/5 to-background">
      <div className="container px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
            <div className="flex items-start gap-3">
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-accent/15 text-accent-strong mt-0.5">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  Popular & Trending
                </h2>
                <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  One-time events coming up. Grab a spot before they fill up.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAll(v => !v)}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {showAll ? 'Show as carousel' : `See all (${visible.length})`}
            </button>
          </div>

          {!feedFilters && <SectionFilterBar value={filters} onChange={setFilters} />}

          {visible.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No trending events match those filters yet.
            </p>
          ) : showAll ? (
            <ExpandableEventGrid
              events={visible}
              onAttend={onAttend}
              onParticipantClick={onParticipantClick}
              onOpenGroupChat={onOpenGroupChat}
              guest={guest}
              hideCategory={hideCategory}
            />
          ) : (
            <EventCarousel
              events={visible}
              onAttend={onAttend}
              onParticipantClick={onParticipantClick}
              onOpenGroupChat={onOpenGroupChat}
              guest={guest}
              hideCategory={hideCategory}
            />
          )}
        </div>
      </div>
    </section>
  );
};

export default PopularTrendingSection;


