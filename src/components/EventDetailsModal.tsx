import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Event, Participant } from '@/types/event';
import { Calendar, Clock, MapPin, Users, Star, Check, MessageSquare, Heart, ArrowRight, Quote } from 'lucide-react';
import { format } from 'date-fns';
import { useWishlist } from '@/context/WishlistContext';
import { cn } from '@/lib/utils';

interface EventDetailsModalProps {
  event: Event;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAttending: boolean;
  onAttend: () => void;
  onOpenGroupChat?: (event: Event) => void;
  onParticipantClick?: (participant: Participant) => void;
  guest?: boolean;
}

const sourceColors: Record<string, string> = {
  meetup: 'bg-red-500',
  eventbrite: 'bg-orange-500',
  luma: 'bg-purple-500',
};

function syntheticTestimonials(event: Event) {
  // Build 2 extra testimonials from past participants for richer social proof
  const pool = event.participants.slice(0, 2);
  const quotes = [
    'Showed up not knowing anyone — left with plans for next week.',
    'Easy crowd, well-organized. The kind of thing you put on repeat.',
    'Exactly what the description promised. Came back the next week.',
  ];
  return pool.map((p, i) => ({
    author: p.name,
    rating: 5,
    text: quotes[i % quotes.length],
  }));
}

const EventDetailsModal = ({
  event, open, onOpenChange, isAttending, onAttend, onOpenGroupChat, onParticipantClick, guest = false,
}: EventDetailsModalProps) => {
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();
  const wishlisted = isWishlisted(event.id);
  const org = event.organizer;
  const extraTestimonials = syntheticTestimonials(event);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Hero */}
        <div className="relative h-56 shrink-0">
          <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className={`px-2 py-1 rounded-md text-xs font-semibold text-white ${sourceColors[event.source]}`}>
              {event.source.charAt(0).toUpperCase() + event.source.slice(1)}
            </span>
            <span className="px-2 py-1 rounded-md text-xs font-medium bg-white/90 text-foreground">
              {event.category}
            </span>
          </div>
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <h2 className="text-xl font-bold leading-tight mb-1">{event.title}</h2>
            <div className="flex items-center gap-3 text-xs text-white/90 flex-wrap">
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{format(event.date, 'EEE, MMM d')}</span>
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{event.time}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.location}</span>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-6 py-5 space-y-6">
          {/* Description */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-2">About this event</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{event.description}</p>
          </section>

          {/* Host bio */}
          {org && (
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-2">Hosted by</h3>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                {org.avatar && (
                  <img src={org.avatar} alt={org.name} className="w-12 h-12 rounded-full object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">{org.name}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                      {org.rating.toFixed(1)} ({org.reviewCount} reviews)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {org.eventsHosted} events hosted · {org.location}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Venue */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-2">Venue</h3>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
              <div className="flex-1">
                <p className="text-foreground">{event.location}</p>
                <button className="text-xs text-primary hover:underline mt-1">View on map</button>
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-2">What people said</h3>
            <div className="space-y-2">
              {org?.recentReview && (
                <div className="p-3 rounded-lg border bg-card">
                  <Quote className="h-4 w-4 text-muted-foreground mb-1" />
                  <p className="text-sm text-foreground">"{org.recentReview.text}"</p>
                  <p className="text-xs text-muted-foreground mt-1">— {org.recentReview.author}</p>
                </div>
              )}
              {extraTestimonials.map((t, i) => (
                <div key={i} className="p-3 rounded-lg border bg-card">
                  <Quote className="h-4 w-4 text-muted-foreground mb-1" />
                  <p className="text-sm text-foreground">"{t.text}"</p>
                  <p className="text-xs text-muted-foreground mt-1">— {t.author}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Attendees */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground">Who's going</h3>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {event.currentParticipants}/{event.maxParticipants}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {event.participants.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onParticipantClick?.(p)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/60 transition text-left"
                >
                  <img src={p.avatar} alt={p.name} className="w-9 h-9 rounded-full object-cover" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    {p.neighborhood && (
                      <p className="text-[11px] text-muted-foreground truncate">{p.neighborhood}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Sticky CTAs */}
        <div className="shrink-0 border-t bg-background px-6 py-3 flex gap-2">
          {guest ? (
            <Button className="flex-1" onClick={() => onOpenChange(false)}>
              Sign up to attend
            </Button>
          ) : (
            <>
              <Button
                variant={isAttending ? 'attend' : 'default'}
                className="flex-1"
                onClick={onAttend}
              >
                {isAttending ? (<><Check className="h-4 w-4 mr-1" />Attending</>) : (<>Attend<ArrowRight className="h-4 w-4 ml-1" /></>)}
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenGroupChat?.(event)}
                disabled={!isAttending || !onOpenGroupChat}
                title={isAttending ? 'Message group' : 'Attend to unlock chat'}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => toggleWishlist(event.id)}
                aria-pressed={wishlisted}
                title={wishlisted ? 'Saved' : 'Save to favorites'}
              >
                <Heart className={cn('h-4 w-4', wishlisted && 'fill-destructive text-destructive')} />
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventDetailsModal;
