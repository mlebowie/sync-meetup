import { Navigate, Link } from 'react-router-dom';
import { ArrowLeft, Heart, Bell, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import Header from '@/components/Header';
import EventCard from '@/components/EventCard';
import { Button } from '@/components/ui/button';
import { getUserProfile, ONBOARDING_INTERESTS } from '@/lib/userProfile';
import { useWishlist } from '@/context/WishlistContext';
import { mockEvents } from '@/data/mockData';
import { getDailyRotatingEvents } from '@/lib/dailyEvents';

const Profile = () => {
  const profile = getUserProfile();
  if (!profile) return <Navigate to="/onboarding" replace />;

  const { getWishlistedEvents } = useWishlist();
  const allEvents = getDailyRotatingEvents(mockEvents);
  const wishlist = getWishlistedEvents(allEvents);

  const interests = ONBOARDING_INTERESTS.filter(i => profile.interests.includes(i.id));

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
            <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1">
              <MapPin className="h-3.5 w-3.5" />
              {[profile.neighborhood, profile.location].filter(Boolean).join(', ')}
            </p>
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

export default Profile;
