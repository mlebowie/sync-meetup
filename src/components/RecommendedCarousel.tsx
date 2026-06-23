import { useMemo, useState } from 'react';
import { mockEvents } from '@/data/mockData';
import { getInterestKeywords, UserProfile } from '@/lib/userProfile';
import { Event, Participant } from '@/types/event';
import EventCard from './EventCard';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Sparkles, Shuffle, RotateCcw } from 'lucide-react';

interface Props {
  profile: UserProfile;
  onAttend: (id: string) => void;
  onParticipantClick?: (p: Participant) => void;
  onOpenGroupChat?: (e: Event) => void;
}

// Re-anchor events into the "next 3–6 hours" window for the carousel.
const SOON_OFFSETS = [180, 220, 270, 320, 360].map(m => m * 60 * 1000);

const RecommendedCarousel = ({ profile, onAttend, onParticipantClick, onOpenGroupChat }: Props) => {
  const [mode, setMode] = useState<'recommended' | 'random'>('recommended');

  const recommended: Event[] = useMemo(() => {
    const keywords = getInterestKeywords(profile.interests).map(k => k.toLowerCase());
    const matches = mockEvents.filter(e => {
      const blob = [e.category, ...e.tags].join(' ').toLowerCase();
      return keywords.some(k => blob.includes(k));
    });
    const pool = matches.length >= 5 ? matches : [...matches, ...mockEvents.filter(e => !matches.includes(e))];
    return pool.slice(0, 5);
  }, [profile.interests]);

  const random: Event[] = useMemo(() => {
    const keywords = getInterestKeywords(profile.interests).map(k => k.toLowerCase());
    // Pick events that do NOT match any preferred interest.
    const offMatches = mockEvents.filter(e => {
      const blob = [e.category, ...e.tags].join(' ').toLowerCase();
      return !keywords.some(k => blob.includes(k));
    });
    const pool = offMatches.length >= 5 ? offMatches : [...offMatches, ...mockEvents];
    return [...pool].sort(() => Math.random() - 0.5).slice(0, 5);
  }, [profile.interests, mode]);

  const source = mode === 'random' ? random : recommended;
  const now = Date.now();
  const events = source.map((e, i) => ({ ...e, date: new Date(now + SOON_OFFSETS[i % SOON_OFFSETS.length]) }));

  return (
    <section className="py-8 md:py-12 bg-gradient-to-b from-primary/5 to-transparent">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-primary font-semibold mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              {mode === 'random' ? 'Wild card' : 'Recommended for you'}
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">
              {mode === 'random'
                ? 'Try something off your usual path'
                : 'Recommended for you'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === 'random'
                ? 'Random picks unrelated to your interests — break the algorithm.'
                : 'Events happening in the next 3–6 hours, picked from your interests.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={mode === 'random' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('random')}
            >
              <Shuffle className="h-4 w-4 mr-1.5" />
              Choose a random activity for me
            </Button>
            {mode === 'random' && (
              <Button variant="ghost" size="sm" onClick={() => setMode('recommended')}>
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Reset
              </Button>
            )}
          </div>
        </div>

        <Carousel opts={{ align: 'start', loop: false }} className="w-full">
          <CarouselContent className="-ml-4">
            {events.map(e => (
              <CarouselItem key={e.id} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                <EventCard
                  event={e}
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

export default RecommendedCarousel;
