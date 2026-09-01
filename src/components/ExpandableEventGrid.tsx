import { useState } from 'react';
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
  /** Extra cards revealed on expand */
  expandCount?: number;
}

const ExpandableEventGrid = ({
  events,
  onAttend,
  onParticipantClick,
  onOpenGroupChat,
  guest = false,
  initialCount = 3,
  expandCount = 10,
}: Props) => {
  const [expanded, setExpanded] = useState(false);

  const primary = events.slice(0, initialCount);
  const extra = events.slice(initialCount, initialCount + expandCount);
  const hasMore = extra.length > 0;

  const card = (e: Event) => (
    <EventCard
      event={e}
      onAttend={onAttend}
      onParticipantClick={onParticipantClick}
      onOpenGroupChat={onOpenGroupChat}
      guest={guest}
    />
  );

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
{primary.map((e, i) => (
          <div key={e.id} id={`event-${e.id}`} className="animate-fade-in-up scroll-mt-24" style={{ animationDelay: `${i * 0.06}s` }}>
            {card(e)}
          </div>
        ))}
      </div>

      {hasMore && expanded && (
        <div className="mt-6 max-h-[70vh] overflow-y-auto pr-1 space-y-4 rounded-xl">
{extra.map(e => (
            <div key={e.id} id={`event-${e.id}`} className="animate-fade-in-up scroll-mt-24">
              {card(e)}
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-card border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            {expanded ? (
              <>Show less <ChevronUp className="h-4 w-4" /></>
            ) : (
              <>View more ({extra.length}) <ChevronDown className="h-4 w-4" /></>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ExpandableEventGrid;
