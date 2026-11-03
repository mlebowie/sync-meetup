import { useMemo } from 'react';
import { Event, Participant } from '@/types/event';
import { useEvents } from '@/context/EventsContext';
import EventCard from './EventCard';
import { Star } from 'lucide-react';

interface Props {
  onAttend: (id: string) => void;
  onParticipantClick?: (p: Participant) => void;
  onOpenGroupChat?: (event: Event) => void;
  guest?: boolean;
}

/**
 * Spotlight for events a curator has marked as featured (the `featured` tag,
 * set from /curate). Only real collected events can be featured, so the section
 * stays hidden while the sample set is showing or when nothing is featured.
 */
const FeaturedPartnerSection = ({ onAttend, onParticipantClick, onOpenGroupChat, guest = false }: Props) => {
  const { events, isLive } = useEvents();

  const featured = useMemo(() => {
    if (!isLive) return [];
    const now = Date.now();
    return events
      .filter(e => e.featured && e.date.getTime() >= now - 30 * 60 * 1000)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 3);
  }, [events, isLive]);

  if (featured.length === 0) return null;

  return (
    <section className="py-8 md:py-10">
      <div className="container px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start gap-3 mb-5">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-[#C1694F]/15 text-[#C1694F] mt-0.5">
              <Star className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Featured</h2>
              <p className="text-muted-foreground mt-1">
                Hand-picked gatherings from SYNC and our partners.
              </p>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onAttend={onAttend}
                onParticipantClick={onParticipantClick}
                onOpenGroupChat={onOpenGroupChat}
                guest={guest}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedPartnerSection;
