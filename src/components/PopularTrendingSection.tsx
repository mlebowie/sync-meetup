import { useMemo } from 'react';
import { Event, Participant } from '@/types/event';
import { mockEvents } from '@/data/mockData';
import ExpandableEventGrid from './ExpandableEventGrid';
import { TrendingUp, Clock } from 'lucide-react';

interface Props {
  onAttend: (id: string) => void;
  onParticipantClick?: (p: Participant) => void;
  onOpenGroupChat?: (event: Event) => void;
  guest?: boolean;
}

// Spread trending one-off events across the next 7–14 days.
const TRENDING_OFFSETS = [3, 5, 7, 10, 12, 14, 16, 18, 20, 22].map(d => d * 24 * 60 * 60 * 1000);

const PopularTrendingSection = ({ onAttend, onParticipantClick, onOpenGroupChat, guest = false }: Props) => {
  const trendingEvents: Event[] = useMemo(() => {
    const now = Date.now();
    const oneOffs = mockEvents.filter(e => e.recurrence === 'one-off');
    return oneOffs.slice(0, 13).map((e, i) => ({
      ...e,
      date: new Date(now + TRENDING_OFFSETS[i % TRENDING_OFFSETS.length]),
    }));
  }, []);

  if (trendingEvents.length === 0) return null;

  return (
    <section className="py-10 md:py-14 bg-gradient-to-b from-accent/5 via-primary/5 to-background">
      <div className="container px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start gap-3 mb-6">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-accent/15 text-accent mt-0.5">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Popular & Trending
              </h2>
              <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                One-time events coming up — grab a spot before they fill up.
              </p>
            </div>
          </div>

          <ExpandableEventGrid
            events={trendingEvents}
            onAttend={onAttend}
            onParticipantClick={onParticipantClick}
            onOpenGroupChat={onOpenGroupChat}
            guest={guest}
          />
        </div>
      </div>
    </section>
  );
};

export default PopularTrendingSection;

