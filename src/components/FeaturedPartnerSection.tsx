import { useMemo, useState } from 'react';
import { Event, Participant } from '@/types/event';
import { useEvents } from '@/context/EventsContext';
import { FeedFilters } from '@/lib/feedFilters';
import EventCarousel from './EventCarousel';
import ExpandableEventGrid from './ExpandableEventGrid';

interface Props {
  /** Only the inclusivity toggles apply here (Women only, LGBTQ+, Pet friendly). */
  filters?: FeedFilters;
  onAttend: (id: string) => void;
  onParticipantClick?: (p: Participant) => void;
  onOpenGroupChat?: (event: Event) => void;
  guest?: boolean;
}

const MAX_SHOWN = 15;

/**
 * Upcoming events from SYNC's community partners (the `sync-partner` tag), the
 * ones the curator featured first, then by date. Shown to every member whatever
 * their interests; a member's Women only, LGBTQ+ and Pet friendly toggles still
 * apply. Hidden while the sample set is showing or when no partner event is
 * coming up.
 */
const FeaturedPartnerSection = ({ filters, onAttend, onParticipantClick, onOpenGroupChat, guest = false }: Props) => {
  const { events, isLive } = useEvents();
  const [showAll, setShowAll] = useState(false);

  const partnerEvents = useMemo(() => {
    if (!isLive) return [];
    const now = Date.now();
    return events
      .filter(e => e.partner && e.date.getTime() >= now - 30 * 60 * 1000)
      .filter(e => !filters?.womenOnly || e.womenOnly)
      .filter(e => !filters?.lgbtqFriendly || e.lgbtqFriendly)
      .filter(e => !filters?.petFriendly || e.petFriendly)
      .sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || a.date.getTime() - b.date.getTime())
      .slice(0, MAX_SHOWN);
  }, [events, isLive, filters?.womenOnly, filters?.lgbtqFriendly, filters?.petFriendly]);

  if (partnerEvents.length === 0) return null;

  return (
    <section className="py-8 md:py-10">
      <div className="container px-4 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Our community partners</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Gatherings hosted by the Porto communities SYNC works with.
            </p>
          </div>
          {partnerEvents.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAll(v => !v)}
              className="text-sm font-semibold text-primary-text hover:underline"
            >
              {showAll ? 'Show as carousel' : `See all (${partnerEvents.length})`}
            </button>
          )}
        </div>
        {showAll ? (
          <ExpandableEventGrid
            events={partnerEvents}
            onAttend={onAttend}
            onParticipantClick={onParticipantClick}
            onOpenGroupChat={onOpenGroupChat}
            guest={guest}
          />
        ) : (
          <EventCarousel
            events={partnerEvents}
            onAttend={onAttend}
            onParticipantClick={onParticipantClick}
            onOpenGroupChat={onOpenGroupChat}
            guest={guest}
          />
        )}
      </div>
    </section>
  );
};

export default FeaturedPartnerSection;
