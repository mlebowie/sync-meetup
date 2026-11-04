import { useMemo, useState } from 'react';
import { withSampleDate } from '@/lib/sampleDates';
import { useEvents } from '@/context/EventsContext';
import { getInterestKeywords } from '@/lib/userProfile';
import { FeedFilters, applyFeedFilters, scopeName } from '@/lib/feedFilters';
import { Event, Participant } from '@/types/event';
import EventCard from './EventCard';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Clock, Shuffle, RotateCcw } from 'lucide-react';

interface Props {
  filters: FeedFilters;
  profileInterests: string[];
  hideCategory?: boolean;
  onAttend: (id: string) => void;
  onParticipantClick?: (p: Participant) => void;
  onOpenGroupChat?: (e: Event) => void;
}

const SIX_HOURS = 6 * 60 * 60 * 1000;
// Re-anchor sample events into the "next 3–6 hours" window (real events keep their own time).
const SOON_OFFSETS = [180, 220, 270, 320, 360].map(m => m * 60 * 1000);

/**
 * Events starting in the next six hours. The feed's interest, size and
 * inclusivity filters apply; its time chips don't, because this section is
 * already about right now. If nothing matches, it says so and shows what else is on.
 */
const HappeningSoonSection = ({ filters, profileInterests, hideCategory = false, onAttend, onParticipantClick, onOpenGroupChat }: Props) => {
  const { events: allEvents } = useEvents();
  const [mode, setMode] = useState<'soon' | 'random'>('soon');

  const soonPool = useMemo(() => {
    const now = Date.now();
    return allEvents.filter(e => {
      if (!e.live) return true;
      const diff = e.date.getTime() - now;
      return diff >= 0 && diff <= SIX_HOURS;
    });
  }, [allEvents]);

  const matched = useMemo(
    () => applyFeedFilters(soonPool, filters, profileInterests, { ignoreTime: true }).slice(0, 5),
    [soonPool, filters, profileInterests],
  );

  const random: Event[] = useMemo(() => {
    const keywords = getInterestKeywords(profileInterests).map(k => k.toLowerCase());
    // Pick events that do NOT match any of the user's interests.
    const offMatches = soonPool.filter(e => {
      const blob = [e.category, ...e.tags].join(' ').toLowerCase();
      return !keywords.some(k => blob.includes(k));
    });
    const pool = offMatches.length >= 5 ? offMatches : [...offMatches, ...soonPool];
    return [...pool].sort(() => Math.random() - 0.5).slice(0, 5);
    // `mode` re-rolls the picks each time the button is pressed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileInterests, soonPool, mode]);

  const noMatch = mode === 'soon' && matched.length === 0;
  const source = mode === 'random' ? random : noMatch ? soonPool.slice(0, 5) : matched;
  const now = Date.now();
  const events = source.map((e, i) => withSampleDate(e, now + SOON_OFFSETS[i % SOON_OFFSETS.length]));

  if (events.length === 0) return null;

  return (
    <section className="py-8 md:py-10">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
              {mode === 'random' ? 'Try something off your usual path' : 'Happening in the next 6 hours'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === 'random'
                ? 'Random picks outside your interests. Break the algorithm.'
                : `Starting soon, picked from ${scopeName(filters)}.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant={mode === 'random' ? 'default' : 'outline'} size="sm" onClick={() => setMode(m => (m === 'random' ? 'soon' : 'random'))}>
              <Shuffle className="h-4 w-4 mr-1.5" />
              Choose a random activity for me
            </Button>
            {mode === 'random' && (
              <Button variant="ghost" size="sm" onClick={() => setMode('soon')}>
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Back to my picks
              </Button>
            )}
          </div>
        </div>

        {noMatch && (
          <p className="inline-block mb-4 rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground">
            Nothing in {scopeName(filters)} in the next 6 hours. Here is what else is on.
          </p>
        )}

        <Carousel opts={{ align: 'start', loop: false }} className="w-full">
          <CarouselContent className="-ml-4">
            {events.map(e => (
              <CarouselItem key={e.id} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                <EventCard
                  event={e}
                  hideCategory={hideCategory && mode === 'soon' && !noMatch}
                  onAttend={onAttend}
                  onParticipantClick={onParticipantClick}
                  onOpenGroupChat={onOpenGroupChat}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex" />
          <CarouselNext className="hidden md:flex" />
        </Carousel>
      </div>
    </section>
  );
};

export default HappeningSoonSection;
