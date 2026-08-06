import { Link } from 'react-router-dom';
import { ArrowLeft, Heart, Bell, Calendar, MapPin, Compass, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import Header from '@/components/Header';
import EventCard from '@/components/EventCard';
import ComingUpSection from '@/components/ComingUpSection';
import { Button } from '@/components/ui/button';
import { getUserProfile } from '@/lib/userProfile';
import { useWishlist } from '@/context/WishlistContext';
import { useActivityHistory } from '@/context/ActivityHistoryContext';
import { mockEvents } from '@/data/mockData';
import { getDailyRotatingEvents } from '@/lib/dailyEvents';

const CalendarPage = () => {
  const isDefault = !getUserProfile();
  const { getWishlistedEvents } = useWishlist();
  const rotatingEvents = getDailyRotatingEvents(mockEvents);
  const wishlist = getWishlistedEvents(rotatingEvents);

  const { history } = useActivityHistory();
  const attendedEvents = isDefault ? [] : history.slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 md:px-6 py-8 max-w-5xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <h1 className="text-2xl font-bold mb-8">My calendar</h1>

        {/* Coming Up */}
        <ComingUpSection allEvents={mockEvents} />

        {/* Attended events */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Last attended events</h2>
            {attendedEvents.length > 0 && (
              <span className="text-sm text-muted-foreground">({attendedEvents.length})</span>
            )}
          </div>

          {attendedEvents.length === 0 ? (
            <div className="text-center py-14 border border-dashed rounded-2xl bg-card/40">
              <Compass className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground mb-1">No events attended yet.</p>
              <p className="text-sm text-muted-foreground/70 mb-5">Find something happening near you.</p>
              <Button asChild variant="hero">
                <Link to="/">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Discover events
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {attendedEvents.map(h => (
                <div key={h.eventId} className="p-4 rounded-xl border bg-card hover:shadow-card-hover transition-shadow">
                  <p className="font-medium text-sm line-clamp-2">{h.title}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                    <Calendar className="h-3 w-3" />
                    {format(h.date, 'EEE, MMM d')}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
                      {h.category}
                    </span>
                    {h.location && (
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5 truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{h.location}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Wishlist */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-destructive fill-destructive" />
              <h2 className="text-xl font-bold">My wishlist</h2>
              <span className="text-sm text-muted-foreground">({wishlist.length})</span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-6 flex items-start gap-2 p-3 rounded-lg bg-muted/50">
            <Bell className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <span>We'll notify you when a wishlisted event is nearing capacity and 24 hours before it starts.</span>
          </p>

          {wishlist.length === 0 ? (
            <div className="text-center py-16 border border-dashed rounded-2xl">
              <Heart className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground mb-4">No saved events yet.</p>
              <Button asChild>
                <Link to="/">Browse events</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {wishlist.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>

        {/* Quick agenda preview */}
        {wishlist.length > 0 && (
          <section className="mt-10">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Upcoming on your wishlist</h3>
            <ul className="space-y-2">
              {wishlist
                .slice()
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .slice(0, 5)
                .map(e => (
                  <li key={e.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{e.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3 w-3" />
                        {format(e.date, 'EEE, MMM d')} · {e.time}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 ml-3">
                      {e.currentParticipants}/{e.maxParticipants}
                    </span>
                  </li>
                ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
};

export default CalendarPage;
