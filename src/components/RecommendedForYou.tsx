import { Event, Participant } from '@/types/event';
import { useActivityHistory } from '@/context/ActivityHistoryContext';
import { rankEvents } from '@/lib/recommendations';
import EventCard from './EventCard';
import { Sparkles } from 'lucide-react';
import { useMemo } from 'react';

interface Props {
  events: Event[];
  onAttend: (id: string) => void;
  onParticipantClick: (p: Participant) => void;
  onOpenGroupChat: (e: Event) => void;
}

const RecommendedForYou = ({ events, onAttend, onParticipantClick, onOpenGroupChat }: Props) => {
  const { history, seriesCount, crossedPathsWith, categoryAffinity } = useActivityHistory();

  const ranked = useMemo(
    () => rankEvents(events, { history, seriesCount, crossedPathsWith, categoryAffinity }).slice(0, 3),
    [events, history, seriesCount, crossedPathsWith, categoryAffinity],
  );

  if (ranked.length === 0) return null;

  return (
    <section className="py-8 md:py-12 bg-gradient-to-b from-primary/5 to-transparent">
      <div className="container px-4 md:px-6">
        <div className="flex items-baseline justify-between mb-5">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Picked from your pattern
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Based on what you've shown up to and who you keep meeting
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ranked.map(({ event, reasons }) => (
            <div key={event.id} className="flex flex-col">
              <EventCard
                event={event}
                onAttend={onAttend}
                onParticipantClick={onParticipantClick}
                onOpenGroupChat={onOpenGroupChat}
              />
              {reasons.length > 0 && (
                <div className="mt-2 px-1 text-xs text-muted-foreground">
                  <span className="font-semibold text-primary">Why: </span>
                  {reasons.slice(0, 2).join(' · ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RecommendedForYou;
