import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mockEvents } from '@/data/mockData';
import { ONBOARDING_INTERESTS } from '@/lib/userProfile';
import { searchEvents } from '@/lib/search';
import { Event, Participant } from '@/types/event';
import EventCard from './EventCard';
import PopularTrendingSection from './PopularTrendingSection';
import { Users, Globe2, Sparkles, Clock, ArrowRight, Search, X } from 'lucide-react';

interface Props {
  onAttend: (id: string) => void;
  onParticipantClick?: (p: Participant) => void;
}

// Re-anchor mock events so they read as "happening in Porto in the next 2–6h".
// Spread 8 events across the 2h–6h window (in minutes).
const SOON_OFFSETS = [120, 165, 210, 255, 300, 330, 345, 360].map(m => m * 60 * 1000);

const GuestLanding = ({ onAttend, onParticipantClick }: Props) => {
  const [query, setQuery] = useState('');
  const portoEvents: Event[] = useMemo(() => {
    const now = Date.now();
    return mockEvents
      .filter(e => e.location.toLowerCase().includes('porto'))
      .slice(0, 8)
      .map((e, i) => ({ ...e, date: new Date(now + SOON_OFFSETS[i % SOON_OFFSETS.length]) }));
  }, []);

  const filteredPorto = useMemo(() => searchEvents(portoEvents, query), [portoEvents, query]);

  // Platform-wide stats derived from mock data — feels real, not hardcoded.
  const stats = useMemo(() => {
    const totalUsers = mockEvents.reduce((acc, e) => acc + e.currentParticipants, 0) * 47 + 12480;
    const nationalities = 64;
    const eventTypes = new Set(mockEvents.map(e => e.category)).size;
    const happeningNextHour = Math.max(3, Math.round(mockEvents.length * 0.4));
    return { totalUsers, nationalities, eventTypes, happeningNextHour };
  }, []);

  return (
    <>
      {/* Stats dashboard */}
      <section className="py-10 md:py-14 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container px-4 md:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Sync, by the numbers
              </h2>
              <p className="text-muted-foreground mt-1">
                Live snapshot of the community right now
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={<Users className="h-5 w-5" />} value={stats.totalUsers.toLocaleString()} label="Total users" />
              <StatCard icon={<Globe2 className="h-5 w-5" />} value={stats.nationalities.toString()} label="Nationalities" />
              <StatCard icon={<Sparkles className="h-5 w-5" />} value={stats.eventTypes.toString()} label="Types of events" />
              <StatCard icon={<Clock className="h-5 w-5" />} value={stats.happeningNextHour.toString()} label="Happening next hour" />
            </div>
          </div>
        </div>
      </section>

      {/* Popular & Trending — one-time events */}
      <PopularTrendingSection
        onAttend={onAttend}
        onParticipantClick={onParticipantClick}
        guest
      />

      {/* Public Porto feed */}
      <section className="py-10 md:py-14">
        <div className="container px-4 md:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  Happening in Porto, next 2–6 hours
                </h2>
                <p className="text-muted-foreground mt-1">
                  Browse what's open right now. Sign up to see familiar faces and personal picks.
                </p>
              </div>
              <Link to="/onboarding">
                <Button variant="hero">
                  Create account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

{/* Search — same utility the homefeed uses */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search events, locations, organizers…"
                className="pl-9 pr-9"
                aria-label="Search events"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {filteredPorto.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-2xl">
                <p className="text-muted-foreground mb-4">No events match “{query}”. Try another search.</p>
                <Button variant="outline" onClick={() => setQuery('')}>Clear search</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPorto.map((e, i) => (
                  <div key={e.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.06}s` }}>
                    <EventCard
                      event={e}
                      onAttend={onAttend}
                      onParticipantClick={onParticipantClick}
                      guest
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
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

const StatCard = ({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) => (
  <div className="bg-card rounded-2xl p-5 shadow-card text-center">
    <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary mb-3">
      {icon}
    </div>
    <div className="text-2xl md:text-3xl font-bold text-foreground">{value}</div>
    <div className="text-xs md:text-sm text-muted-foreground mt-1">{label}</div>
  </div>
);

export default GuestLanding;
