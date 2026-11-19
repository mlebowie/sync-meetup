import { useState, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Event, Participant } from '@/types/event';
import { Star, MessageSquare, Heart, Quote, Instagram, Linkedin, Mail, Lock, MessageCircle, Forward, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useWishlist } from '@/context/WishlistContext';
import { cn } from '@/lib/utils';
import { Calendar06, Clock01, Marker02 } from './icons/StratisIcons';
import OrganizerDetailsDialog from './OrganizerDetailsDialog';
import EventPhotoCarousel from './EventPhotoCarousel';
import { useEventRatings } from '@/context/EventRatingContext';
import { useToast } from '@/hooks/use-toast';
import { vibeMeta } from '@/lib/vibe';
import { shareEvent } from '@/lib/shareEvent';

/** "Meetup", "Eventbrite", "Lu.ma" or the site's name, for "Also on" links. */
function platformName(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (host.includes('meetup')) return 'Meetup';
    if (host.includes('eventbrite')) return 'Eventbrite';
    if (host.includes('lu.ma') || host.includes('luma')) return 'Lu.ma';
    return host;
  } catch {
    return 'another site';
  }
}

interface EventDetailsModalProps {
  event: Event;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAttending: boolean;
  cancelArmed?: boolean;
  onAttend: () => void;
  onOpenGroupChat?: (event: Event) => void;
  onParticipantClick?: (participant: Participant) => void;
  guest?: boolean;
}

const sourceNames: Record<string, string> = {
  meetup: 'Meetup',
  eventbrite: 'Eventbrite',
  luma: 'Lu.ma',
  'agenda-porto': 'Agenda Porto',
  fisga: 'Fisga',
  'porto-coffee-week': 'Porto Coffee Week',
  'expat-girls-porto': 'Expat Girls Porto',
  partner: 'Partner',
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
  event, open, onOpenChange, isAttending, cancelArmed = false, onAttend, onOpenGroupChat, onParticipantClick, guest = false,
}: EventDetailsModalProps) => {
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();
  const { friendScore, ratingCount } = useEventRatings();
  const wishlisted = isWishlisted(event.id);
  const org = event.organizer;
  const extraTestimonials = syntheticTestimonials(event);
  const [orgOpen, setOrgOpen] = useState(false);
  const testimonialsRef = useRef<HTMLElement>(null);
  
  const { toast } = useToast();

  // Only the event's own description, plus the host's own words when they have
  // written a bio; no generic template text.
  const hostBio = org?.bio?.trim();
  const extendedDescription = hostBio
    ? `${event.description}\n\nAbout the host\n${hostBio}`
    : event.description;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col bg-event-card text-event-card-foreground rounded-2xl border-0">
        {/* Hero — attendee photo carousel when photos exist */}
        <EventPhotoCarousel
          eventId={event.id}
          fallbackUrl={event.imageUrl}
          alt={event.title}
          className="h-64 shrink-0"
        >
          {/* Top-left pills (Figma "pill: vibe"): vibe + ratings */}
          <div className="absolute top-3 left-3 right-14 flex items-center gap-2 flex-wrap">
            <span
              title={vibeMeta(event.vibe).description}
              className="flex items-center gap-2 h-8 px-3.5 rounded-full text-sm font-semibold bg-sage-deep text-event-card"
            >
              <span aria-hidden>{vibeMeta(event.vibe).emoji}</span>
              {vibeMeta(event.vibe).label}
            </span>
            {friendScore(event.id) !== null && (
              <button
                type="button"
                onClick={() => testimonialsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                aria-label="Jump to testimonials"
                className="flex items-center h-8 px-3.5 rounded-full text-sm font-semibold bg-sage-deep text-event-card hover:underline underline-offset-2"
              >
                {friendScore(event.id)}% would bring a friend · {ratingCount(event.id)} ratings
              </button>
            )}
          </div>
          {/* Title + date, time and venue over the photo, in cream */}
          <div className="absolute bottom-4 left-6 right-6 text-event-card pointer-events-none">
            <h2 className="text-2xl font-bold leading-[1.45] tracking-[-0.02em] mb-1 line-clamp-2">{event.title}</h2>
            <div className="flex flex-col gap-1 text-[17px] font-semibold leading-[1.45] tracking-[-0.02em]">
              <div className="flex items-center gap-5 whitespace-nowrap">
                <span className="flex items-center gap-2"><Calendar06 className="h-[18px] w-[18px] shrink-0" />{format(event.date, 'EEE, MMM d')}</span>
                <span className="flex items-center gap-2"><Clock01 className="h-[18px] w-[18px] shrink-0" />{event.time}</span>
              </div>
              <span className="flex items-center gap-2 min-w-0"><Marker02 className="h-[18px] w-[18px] shrink-0" /><span className="truncate">{event.location}</span></span>
            </div>
          </div>
        </EventPhotoCarousel>

        {/* Scrollable body */}
        <div className="overflow-y-auto p-6 space-y-7">
          {/* Description */}
          <section>
            <h3 className="text-lg font-bold leading-[1.4] tracking-[-0.005em] text-foreground mb-2">About this event</h3>
            <p className="text-lg font-medium leading-[1.4] tracking-[-0.005em] text-foreground whitespace-pre-line">{extendedDescription}</p>
            {(event.registerUrl || event.sourceUrl) && (
              <a
                href={event.partner ? (event.registerUrl || event.sourceUrl) : event.sourceUrl || event.registerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-base font-semibold text-primary-text underline-offset-2 hover:underline"
              >
                {event.partner || event.source === 'partner' ? 'Register' : `View on ${sourceNames[event.source] ?? event.source}`}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
            {event.whatsappUrl && (
              <a
                href={event.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Join their WhatsApp group
              </a>
            )}
            {!event.partner && event.alsoOn && event.alsoOn.length > 0 && (
              <p className="mt-2 text-sm text-sage-deep">
                Also on{' '}
                {event.alsoOn.map((url, i) => (
                  <span key={url}>
                    {i > 0 && ' · '}
                    <a href={url} target="_blank" rel="noopener noreferrer" className="underline text-primary-text">
                      {platformName(url)}
                    </a>
                  </span>
                ))}
              </p>
            )}
          </section>

          {/* Host bio */}
          {org && (
            <section>
              <h3 className="text-lg font-bold leading-[1.4] tracking-[-0.005em] text-foreground mb-2">Hosted by</h3>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-peach/60 border border-sage/40">
                {org.avatar && (
                  <button onClick={() => setOrgOpen(true)} className="shrink-0">
                    <img src={org.avatar} alt={org.name} className="w-12 h-12 rounded-full object-cover hover:ring-2 hover:ring-primary transition" />
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setOrgOpen(true)}
                      className="font-semibold text-primary-text hover:underline underline-offset-2"
                    >
                      {org.name}
                    </button>
                    {org.social?.instagram && (
                      <a href={`https://instagram.com/${org.social.instagram}`} target="_blank" rel="noreferrer" aria-label="Instagram" className="text-sage-deep hover:text-primary-text">
                        <Instagram className="h-4 w-4" />
                      </a>
                    )}
                    {org.social?.linkedin && (
                      <a href={`https://linkedin.com/in/${org.social.linkedin}`} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="text-sage-deep hover:text-primary-text">
                        <Linkedin className="h-4 w-4" />
                      </a>
                    )}
                    {org.social?.email && (
                      <a href={`mailto:${org.social.email}`} aria-label="Email" className="text-sage-deep hover:text-primary-text">
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
                          ? 'border-sage-deep text-sage-deep hover:bg-sage/20'
                          : 'border-sage text-sage-deep opacity-60 cursor-not-allowed'
                      )}
                    >
                      {isAttending ? <MessageSquare className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      Group chat
                    </button>
                    <span className="flex items-center gap-1 text-xs text-sage-deep">
                      <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                      {org.rating.toFixed(1)} ({org.reviewCount} reviews)
                    </span>
                  </div>
                  <p className="text-sm text-sage-deep mt-0.5">
                    {org.eventsHosted} events hosted · {org.location}
                  </p>
                  <button onClick={() => setOrgOpen(true)} className="text-sm font-semibold text-primary-text hover:underline mt-1">
                    View host profile →
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Venue */}
          <section>
            <h3 className="text-lg font-bold leading-[1.4] tracking-[-0.005em] text-foreground mb-2">Venue</h3>
            <div className="flex items-start gap-2 text-base text-sage-deep">
              <Marker02 className="h-[18px] w-[18px] mt-0.5 text-primary-text shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">{event.location}</p>
                <button className="text-sm font-semibold text-primary-text hover:underline mt-1">View on map</button>
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section ref={testimonialsRef} id={`event-testimonials-${event.id}`} className="scroll-mt-4">
            <h3 className="text-lg font-bold leading-[1.4] tracking-[-0.005em] text-foreground mb-2">What people said</h3>
            <div className="space-y-2">
              {org?.recentReview && (
                <div className="p-4 rounded-xl border border-sage/40 bg-white/60">
                  <Quote className="h-4 w-4 text-primary-text mb-1" />
                  <p className="text-base font-medium text-foreground">"{org.recentReview.text}"</p>
                  <p className="text-sm font-semibold text-sage-deep mt-1">— {org.recentReview.author}</p>
                </div>
              )}
              {extraTestimonials.map((t, i) => (
                <div key={i} className="p-4 rounded-xl border border-sage/40 bg-white/60">
                  <Quote className="h-4 w-4 text-primary-text mb-1" />
                  <p className="text-base font-medium text-foreground">"{t.text}"</p>
                  <p className="text-sm font-semibold text-sage-deep mt-1">— {t.author}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Attendees */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold leading-[1.4] tracking-[-0.005em] text-foreground">Who's going</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {event.participants.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onParticipantClick?.(p)}
                  className="flex items-center gap-2 p-2 rounded-xl hover:bg-sage/15 transition text-left"
                >
                  <img src={p.avatar} alt={p.name} className="w-9 h-9 rounded-full object-cover border border-sage" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    {p.neighborhood && (
                      <p className="text-xs text-sage-deep truncate">{p.neighborhood}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Sticky CTAs (Figma): full-width Register, message pill, heart, share */}
        <div className="shrink-0 border-t border-sage/40 bg-event-card px-6 py-3 flex items-center gap-3">
          {guest ? (
            <Button className="flex-1 h-9 text-base font-medium shadow-none" onClick={() => onOpenChange(false)}>
              Sign up to attend
            </Button>
          ) : (
            <>
              <Button
                variant={isAttending ? (cancelArmed ? 'destructive' : 'attend') : 'default'}
                className="flex-1 h-9 text-base font-medium tracking-[-0.005em] shadow-none"
                onClick={onAttend}
              >
                {isAttending ? (cancelArmed ? 'Cancel registration?' : 'Attending') : 'Register'}
              </Button>
              <button
                type="button"
                onClick={() => onOpenGroupChat?.(event)}
                disabled={!isAttending || !onOpenGroupChat}
                title={isAttending ? 'Message group' : 'Attend to unlock chat'}
                aria-label={isAttending ? 'Message group' : 'Attend to unlock chat'}
                className="h-9 w-14 rounded-full border border-sage-deep text-sage-deep flex items-center justify-center hover:bg-sage/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MessageSquare className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => toggleWishlist(event.id)}
                aria-pressed={wishlisted}
                aria-label={wishlisted ? 'Remove from favorites' : 'Save to favorites'}
                title={wishlisted ? 'Saved' : 'Save to favorites'}
                className="h-9 w-9 rounded-full flex items-center justify-center text-primary-text hover:bg-primary/10 transition-colors"
              >
                <Heart className={cn('h-5 w-5', wishlisted && 'fill-current')} />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => void shareEvent(event, toast)}
            aria-label={`Share ${event.title}`}
            className="h-9 w-9 rounded-full flex items-center justify-center text-primary-text hover:bg-primary/10 transition-colors"
          >
            <Forward className="h-5 w-5" />
          </button>
        </div>
      </DialogContent>
      {org && <OrganizerDetailsDialog organizer={org} open={orgOpen} onOpenChange={setOrgOpen} />}
    </Dialog>
  );
};

export default EventDetailsModal;
