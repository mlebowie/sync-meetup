import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { withSampleDate } from '@/lib/sampleDates';
import { useEvents } from '@/context/EventsContext';
import { ONBOARDING_INTERESTS } from '@/lib/userProfile';
import { Participant } from '@/types/event';
import EventCarousel from './EventCarousel';
import { Sparkles, ArrowRight, Quote } from 'lucide-react';

interface Props {
  onAttend: (id: string) => void;
  onParticipantClick?: (p: Participant) => void;
}

const HOUR = 60 * 60 * 1000;
const WEEK = 7 * 24 * HOUR;
const MAX_EVENTS = 12;

// Sample events are spread across the coming week so the carousel reads as "this week".
const WEEK_OFFSETS = [3, 10, 26, 34, 50, 58, 74, 82, 98, 122, 130, 146].map(h => h * HOUR);

const GuestLanding = ({ onAttend, onParticipantClick }: Props) => {
  const { events: allEvents, isLive } = useEvents();

  // One carousel: featured partner events first, then everything else this week,
  // soonest first. With no events in the next 7 days, fall back to the soonest ones.
  const { weekEvents, isThisWeek } = useMemo(() => {
    const now = Date.now();
    if (isLive) {
      const upcoming = allEvents
        .filter(e => e.date.getTime() >= now - 30 * 60 * 1000)
        .sort((a, b) => a.date.getTime() - b.date.getTime());
      const thisWeek = upcoming.filter(e => e.date.getTime() <= now + WEEK);
      const pool = thisWeek.length ? thisWeek : upcoming;
      const ordered = [...pool.filter(e => e.featured), ...pool.filter(e => !e.featured)];
      return { weekEvents: ordered.slice(0, MAX_EVENTS), isThisWeek: thisWeek.length > 0 };
    }
    return {
      weekEvents: allEvents
        .filter(e => e.location.toLowerCase().includes('porto'))
        .slice(0, MAX_EVENTS)
        .map((e, i) => withSampleDate(e, now + WEEK_OFFSETS[i % WEEK_OFFSETS.length])),
      isThisWeek: true,
    };
  }, [allEvents, isLive]);

  return (
    <>
      {/* Happening this week: the single public carousel */}
      <section id="happening-porto" className="py-12 md:py-16 scroll-mt-24">
        <div className="container px-4 md:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  {isThisWeek ? 'Happening this week' : 'Coming up in Porto'}
                </h2>
                <p className="text-muted-foreground mt-1">
                  Hand-picked gatherings in Porto. Grab a spot before they fill up.
                </p>
              </div>
              <Link to="/onboarding">
                <Button variant="hero">
                  Create account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {weekEvents.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-2xl">
                <p className="text-muted-foreground">New events are on their way. Check back soon.</p>
              </div>
            ) : (
              <EventCarousel
                events={weekEvents}
                onAttend={onAttend}
                onParticipantClick={onParticipantClick}
                guest
              />
            )}
          </div>
        </div>
      </section>

      {/* Why it works: the 50 hours research */}
      <section className="py-12 md:py-16">
        <div className="container px-4 md:px-6">
          <figure className="max-w-5xl mx-auto bg-card border border-border/60 rounded-3xl px-6 py-12 md:px-12 md:py-16 text-center flex flex-col items-center gap-5">
            <Quote className="h-9 w-9 text-accent" aria-hidden="true" />
            <blockquote className="max-w-3xl flex flex-col gap-3">
              <p className="text-5xl md:text-7xl font-light tracking-tight text-primary">About 50 hours</p>
              <p className="text-xl md:text-2xl text-foreground leading-snug">
                of time together turns an acquaintance into a casual friend. Showing up regularly with the same people is how you get there.
              </p>
            </blockquote>
            <figcaption className="text-sm text-muted-foreground">
              Based on research by Jeffrey Hall, University of Kansas, 2018
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Sign-up CTA panel */}
      <section className="py-12">
        <div className="container px-4 md:px-6">
          <div className="max-w-4xl mx-auto rounded-2xl bg-gradient-to-r from-primary/15 via-accent/10 to-primary/15 p-8 md:p-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
              <Sparkles className="h-3.5 w-3.5" /> Get a feed picked for you
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Create an account, add your interests, unlock your crew.
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Tell us what you're into and Sync curates a feed of events where you'll recognise faces — week after week.
            </p>

            {/* Interest preview pills */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {ONBOARDING_INTERESTS.slice(0, 10).map(i => (
                <span
                  key={i.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-sm text-foreground"
                >
                  <span>{i.icon}</span>
                  {i.label}
                </span>
              ))}
              <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-muted text-sm text-muted-foreground">
                +{ONBOARDING_INTERESTS.length - 10} more
              </span>
            </div>

            <Link to="/onboarding">
              <Button variant="hero" size="xl">
                Create account & add interests
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default GuestLanding;
