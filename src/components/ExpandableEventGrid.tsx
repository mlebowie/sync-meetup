import { useRef, useState } from 'react';
import { Event, Participant } from '@/types/event';
import EventCard from './EventCard';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  events: Event[];
  onAttend: (id: string) => void;
  onParticipantClick?: (p: Participant) => void;
  onOpenGroupChat?: (e: Event) => void;
  guest?: boolean;
  /** Cards shown before expanding */
  initialCount?: number;
  /** How many extra cards each "View more results" click appends */
  batchSize?: number;
}

const ExpandableEventGrid = ({
  events,
  onAttend,
  onParticipantClick,
  onOpenGroupChat,
  guest = false,
  initialCount = 3,
  batchSize = 12,
}: Props) => {
  const topRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(initialCount);

  const shown = events.slice(0, visibleCount);
  const remaining = Math.max(events.length - shown.length, 0);
  const isExpanded = visibleCount > initialCount;
  const hasMore = remaining > 0;

  const collapse = () => {
    setVisibleCount(initialCount);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div>
      <div ref={topRef} className="scroll-mt-24" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shown.map((e, i) => (
          <div
            key={e.id}
            id={`event-${e.id}`}
            className="animate-fade-in-up scroll-mt-24"
            style={{ animationDelay: `${(i % batchSize) * 0.04}s` }}
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

      {(hasMore || isExpanded) && (
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          {hasMore && (
            <button
              type="button"
              onClick={() => setVisibleCount(c => c + batchSize)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-card border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              View more results ({remaining} remaining) <ChevronDown className="h-4 w-4" />
            </button>
          )}
          {isExpanded && (
            <button
              type="button"
              onClick={collapse}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-card border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Show less <ChevronUp className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ExpandableEventGrid;
