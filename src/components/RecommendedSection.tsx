import { useMemo, useState } from 'react';
import { useEvents } from '@/context/EventsContext';
import { useActivityHistory } from '@/context/ActivityHistoryContext';
import { FeedFilters, applyFeedFilters, scopeName } from '@/lib/feedFilters';
import { Event, Participant } from '@/types/event';
import EventCarousel from './EventCarousel';
import ExpandableEventGrid from './ExpandableEventGrid';
import { Sparkles } from 'lucide-react';

interface Props {
  filters: FeedFilters;
  profileInterests: string[];
  hideCategory?: boolean;
  onAttend: (id: string) => void;
  onParticipantClick?: (p: Participant) => void;
  onOpenGroupChat?: (e: Event) => void;
}

/** Filtered events, ranked by how many people you've crossed paths with are going. */
const RecommendedSection = ({ filters, profileInterests, hideCategory = false, onAttend, onParticipantClick, onOpenGroupChat }: Props) => {
  const { events } = useEvents();
  const { crossedPathsWith } = useActivityHistory();
  const [showAll, setShowAll] = useState(false);

  const ranked = useMemo(() => {
    const familiar = (e: Event) => e.participants.filter(p => crossedPathsWith(p.id) > 0).length;
    return applyFeedFilters(events, filters, profileInterests)
      .map(e => ({ e, score: familiar(e) }))
      .sort((a, b) => b.score - a.score || a.e.date.getTime() - b.e.date.getTime())
      .map(x => x.e);
  }, [events, filters, profileInterests, crossedPathsWith]);

  const shown = ranked.slice(0, 9);

  return (
    <section className="py-8 md:py-10">
      <div className="container px-4 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
              Recommended for you
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Picked from {scopeName(filters)}, where people you know are going.
            </p>
          </div>
          {shown.length > 0 && (
            <button type="button" onClick={() => setShowAll(v => !v)} className="text-sm font-semibold text-primary hover:underline">
              {showAll ? 'Show as carousel' : `See all (${shown.length})`}
            </button>
          )}
        </div>

        {shown.length === 0 ? (
          <p className="rounded-2xl bg-muted/60 py-8 text-center text-sm text-muted-foreground">
            No matches for these filters. Try removing one.
          </p>
        ) : showAll ? (
          <ExpandableEventGrid
            events={shown}
            hideCategory={hideCategory}
            onAttend={onAttend}
            onParticipantClick={onParticipantClick}
            onOpenGroupChat={onOpenGroupChat}
          />
        ) : (
          <EventCarousel
            events={shown}
            hideCategory={hideCategory}
            onAttend={onAttend}
            onParticipantClick={onParticipantClick}
            onOpenGroupChat={onOpenGroupChat}
          />
        )}
      </div>
    </section>
  );
};

export default RecommendedSection;
