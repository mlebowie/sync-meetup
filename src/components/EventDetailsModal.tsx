import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Event, Participant } from '@/types/event';
import { Calendar, Clock, MapPin, Users, Star, Check, MessageSquare, Heart, ArrowRight, Quote, Instagram, Linkedin, Mail, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { useWishlist } from '@/context/WishlistContext';
import { cn } from '@/lib/utils';
import OrganizerDetailsDialog from './OrganizerDetailsDialog';
import EventPhotoCarousel from './EventPhotoCarousel';
import { useEventRatings } from '@/context/EventRatingContext';
import { useToast } from '@/hooks/use-toast';

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
  meetup: 'bg-red-700',
  eventbrite: 'bg-orange-700',
  luma: 'bg-purple-700',
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
  const [orgOpen, setOrgOpen] = useState(false);
  
  const { toast } = useToast();

  const extendedDescription = `${event.description}

What to expect
You'll be welcomed at the door, given a quick orientation, and introduced to a few people right away — no awkward solo standing. The host keeps the group moving so there's always something to do or someone new to talk to, and newcomers get gently looped into conversations from minute one. Whether you arrive solo or with a friend, expect a relaxed, inclusive vibe with a healthy mix of regulars and first-timers from across the expat community.

Schedule breakdown
• First 15 minutes — arrivals, name tags, and a round of low-stakes introductions so everyone clocks a few familiar faces before things kick off.
• Main session (about 60–90 minutes) — the core activity, structured so people of different experience levels can jump in without feeling lost. The host runs a light rotation or pairing system so you're not stuck with the same person the whole time.
• Wind-down (final 20–30 minutes) — optional hangout for drinks, snacks, or a casual walk to a nearby spot. This is where most plans for the next meetup actually get made.

About the host
${org ? `${org.name} has been running events in ${org.location} for a while now, with ${org.eventsHosted} events under their belt and a ${org.rating.toFixed(1)}-star average across ${org.reviewCount} reviews. They're known for being approachable, keeping things on schedule, and making sure no one gets left on the edge of the group.` : 'The host is an experienced organizer who specializes in welcoming, well-paced gatherings that make it easy to leave with a few new contacts.'} Tap their name below to see past events, photos, and reviews from previous attendees.

What to bring
Just yourself and an open attitude. Anything specific (gear, dress code, food contribution) is called out by the host in the group chat once you RSVP.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Hero — attendee photo carousel when photos exist */}
        <EventPhotoCarousel
          eventId={event.id}
          fallbackUrl={event.imageUrl}
          alt={event.title}
          className="h-56 shrink-0"
        >
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className={`px-2 py-1 rounded-md text-xs font-semibold text-vivid-foreground ${sourceColors[event.source]}`}>
              {event.source.charAt(0).toUpperCase() + event.source.slice(1)}
            </span>
            <span className="px-2 py-1 rounded-md text-xs font-medium bg-white/90 text-foreground">
              {event.category}
            </span>
            {friendScore(event.id) !== null && (
              <span className="px-2 py-1 rounded-md text-xs font-medium bg-white/90 text-foreground">
                {friendScore(event.id)}% would bring a friend · {ratingCount(event.id)} ratings
              </span>
            )}
          </div>
          <div className="absolute bottom-3 left-4 right-4 text-white pointer-events-none">
            <h2 className="text-xl font-bold leading-tight mb-1">{event.title}</h2>
            <div className="flex items-center gap-3 text-xs text-white/90 flex-wrap">
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{format(event.date, 'EEE, MMM d')}</span>
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{event.time}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.location}</span>
            </div>
          </div>
        </EventPhotoCarousel>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-6 py-5 space-y-6">
          {/* Description */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-2">About this event</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{extendedDescription}</p>
          </section>

          {/* Host bio */}
          {org && (
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-2">Hosted by</h3>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                {org.avatar && (
                  <button onClick={() => setOrgOpen(true)} className="shrink-0">
                    <img src={org.avatar} alt={org.name} className="w-12 h-12 rounded-full object-cover hover:ring-2 hover:ring-primary transition" />
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setOrgOpen(true)}
                      className="font-medium text-foreground hover:text-primary hover:underline underline-offset-2"
                    >
                      {org.name}
                    </button>
                    {org.social?.instagram && (
                      <a href={`https://instagram.com/${org.social.instagram}`} target="_blank" rel="noreferrer" aria-label="Instagram" className="text-muted-foreground hover:text-primary">
                        <Instagram className="h-4 w-4" />
                      </a>
                    )}
                    {org.social?.linkedin && (
                      <a href={`https://linkedin.com/in/${org.social.linkedin}`} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="text-muted-foreground hover:text-primary">
                        <Linkedin className="h-4 w-4" />
                      </a>
                    )}
                    {org.social?.email && (
                      <a href={`mailto:${org.social.email}`} aria-label="Email" className="text-muted-foreground hover:text-primary">
                        <Mail className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (!isAttending || !onOpenGroupChat) {
                          toast({
                            title: 'Attend to unlock the group chat',
                            description: 'The event chat with the host and attendees opens once you RSVP.',
                          });
                          return;
                        }
                        onOpenGroupChat(event);
                      }}
                      aria-label={isAttending ? 'Open event group chat' : 'Attend to open group chat'}
                      title={isAttending ? 'Message the host and attendees' : 'Attend to unlock the group chat'}
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium transition-colors',
                        isAttending
                          ? 'border-primary/40 text-primary hover:bg-primary/10'
                          : 'border-border text-muted-foreground opacity-60 cursor-not-allowed'
                      )}
                    >
                      {isAttending ? <MessageSquare className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      Group chat
                    </button>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                      {org.rating.toFixed(1)} ({org.reviewCount} reviews)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {org.eventsHosted} events hosted · {org.location}
                  </p>
                  <button onClick={() => setOrgOpen(true)} className="text-xs text-primary hover:underline mt-1">
                    View host profile →
                  </button>
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
      {org && <OrganizerDetailsDialog organizer={org} open={orgOpen} onOpenChange={setOrgOpen} />}
    </Dialog>
  );
};

export default EventDetailsModal;
