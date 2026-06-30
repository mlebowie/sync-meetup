import { Link } from 'react-router-dom';
import { ArrowLeft, Heart, Bell, Calendar, MapPin, Clock, Compass, Globe, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import Header from '@/components/Header';
import EventCard from '@/components/EventCard';
import ComingUpSection from '@/components/ComingUpSection';
import { Button } from '@/components/ui/button';
import { getUserProfile, ONBOARDING_INTERESTS, DEFAULT_PROFILE, calculateAge } from '@/lib/userProfile';
import { useWishlist } from '@/context/WishlistContext';
import { useActivityHistory } from '@/context/ActivityHistoryContext';
import { mockEvents } from '@/data/mockData';
import { getDailyRotatingEvents } from '@/lib/dailyEvents';

const Profile = () => {
  const realProfile = getUserProfile();
  const profile = realProfile ?? DEFAULT_PROFILE;
  const isDefault = !realProfile;

  const { getWishlistedEvents } = useWishlist();
  const allEvents = getDailyRotatingEvents(mockEvents);
  const wishlist = getWishlistedEvents(allEvents);

  const { history } = useActivityHistory();
  const attendedEvents = isDefault ? [] : history.slice(0, 3);

  const interests = ONBOARDING_INTERESTS.filter(i => profile.interests.includes(i.id));
  const age = profile.dateOfBirth ? calculateAge(profile.dateOfBirth) : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 md:px-6 py-8 max-w-5xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        {/* Profile header */}
        <section className="flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-10">
          <div className="h-24 w-24 rounded-full overflow-hidden bg-muted ring-4 ring-primary/10 shrink-0">
            {profile.photo ? (
              <img src={profile.photo} alt={`${profile.firstName} ${profile.lastName}`} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{profile.firstName} {profile.lastName}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1.5">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {[profile.neighborhood, profile.location].filter(Boolean).join(', ')}
              </span>
              {age !== null && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {age} years old
                </span>
              )}
              {profile.nationality && (
                <span className="flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" />
                  {profile.nationality}
                </span>
              )}
            </div>
            {interests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {interests.map(i => (
                  <span key={i.id} className="px-2.5 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium">
                    {i.icon} {i.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Coming Up */}
        <ComingUpSection allEvents={allEvents} />

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

        {/* Default profile hint */}
        {isDefault && (
          <div className="mt-10 p-4 rounded-xl border bg-secondary/30 text-center">
            <p className="text-sm text-muted-foreground">
              This is a preview profile. <Link to="/onboarding" className="text-primary font-medium hover:underline">Create your own</Link> to unlock a personalized feed.
            </p>
          </div>
        )}

        {/* Your crews - from tagged connections & recurring co-attendance */}
        <div className="mt-10 -mx-4 md:-mx-6">
          <GroupsSection />
        </div>
      </main>
    </div>
  );
};

export default Profile;
