import { useRef } from 'react';
import { Event, Participant } from '@/types/event';
import EventCard from './EventCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  events: Event[];
  onAttend: (id: string) => void;
  onParticipantClick?: (p: Participant) => void;
  onOpenGroupChat?: (e: Event) => void;
  guest?: boolean;
}

/** Horizontal snap-scrolling row of event cards with arrow controls. */
const EventCarousel = ({ events, onAttend, onParticipantClick, onOpenGroupChat, guest = false }: Props) => {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 280), behavior: 'smooth' });
  };

  if (events.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {events.map(e => (
          <div
            key={e.id}
            id={`event-${e.id}`}
            className="snap-start shrink-0 w-[85%] sm:w-[48%] lg:w-[31.5%] scroll-mt-24"
          >
            <EventCard
              event={e}
              onAttend={onAttend}
              onParticipantClick={onParticipantClick}
              onOpenGroupChat={onOpenGroupChat}
              guest={guest}
            />
          </div>
        ))}
      </div>

      {events.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Scroll left"
            className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-card border border-border shadow-card items-center justify-center text-foreground hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Scroll right"
            className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-card border border-border shadow-card items-center justify-center text-foreground hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
};

export default EventCarousel;
