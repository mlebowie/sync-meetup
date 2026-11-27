import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Event, Participant } from '@/types/event';
import { MessageSquare, Heart, TrendingUp, UserPlus, Forward, Ticket } from 'lucide-react';
import { format } from 'date-fns';
import ParticipantAvatars from './ParticipantAvatars';
import OrganizerPopover from './OrganizerPopover';
import EventDetailsModal from './EventDetailsModal';
import EventPhotoCarousel from './EventPhotoCarousel';
import AttendConfirmationDialog from './AttendConfirmationDialog';
import CancelRegistrationDialog, { registrationCancelledToast } from './CancelRegistrationDialog';
import WaitlistDialog from './WaitlistDialog';
import InviteFriendsDialog from './InviteFriendsDialog';
import InvitedSummary from './InvitedSummary';
import { useInvites } from '@/context/InvitesContext';
import { useActivityHistory } from '@/context/ActivityHistoryContext';
import { vibeMeta } from '@/lib/vibe';
import { useWishlist } from '@/context/WishlistContext';
import { useAttending } from '@/context/AttendingContext';
import { useSocial } from '@/context/SocialContext';
import { seedGroupChat } from '@/lib/groupChatSeed';
import { cn } from '@/lib/utils';
import { Calendar06, Clock01, Marker02 } from './icons/StratisIcons';
import { useToast } from '@/hooks/use-toast';
import { getUserProfile } from '@/lib/userProfile';
import { shareEvent } from '@/lib/shareEvent';
import { priceInfo, isPaid } from '@/lib/price';
import { ticketUrl, isTicketPending, setTicketPending } from '@/lib/ticketing';
import TicketSheet from './TicketSheet';
import SignupSheet from './SignupSheet';
import { takePendingIntent, IntentAction } from '@/lib/pendingIntent';
import { startTime24 } from '@/lib/startTime';

interface EventCardProps {
  event: Event;
  onAttend?: (eventId: string) => void;
  onParticipantClick?: (participant: Participant) => void;
  onOpenGroupChat?: (event: Event) => void;
  guest?: boolean;
}



/** Display names for each listing site. */
export const sourceLabels: Record<string, string> = {
  meetup: 'Meetup',
  eventbrite: 'Eventbrite',
  luma: 'Lu.ma',
  'agenda-porto': 'Agenda Porto',
  fisga: 'Fisga',
  'ma-to': 'ma.to',
  'porto-coffee-week': 'Porto Coffee Week',
  'expat-girls-porto': 'Expat Girls Porto',
  partner: 'Partner',
};


const EventCard = ({ event, onAttend, onParticipantClick, onOpenGroupChat, guest = false }: EventCardProps) => {
  const navigate = useNavigate();
  const { isAttending: isAttendingFn, toggle: toggleAttending } = useAttending();
  const { ensureGroupChat } = useSocial();
  // Single source of truth: the attending store (persisted). The per-event flag
  // is only an initial hint, so it must not keep the card "Attending" after a cancel.
  const isAttending = isAttendingFn(event.id);
  const [, setIsHovered] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [cancelArmed, setCancelArmed] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [signupAction, setSignupAction] = useState<IntentAction | null>(null);
  const [ticketPending, setPendingState] = useState(() => isTicketPending(event.id));
  const price = priceInfo(event.priceLabel);
  // Paid events with a ticket link go through "Get tickets" instead of registering in one tap.
  const paid = isPaid(price) && !!ticketUrl(event);
  const markTicketPending = (pending: boolean) => {
    setTicketPending(event.id, pending);
    setPendingState(pending);
  };
  const { getInvited } = useInvites();
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { crossedPathsWith } = useActivityHistory();
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();
  const wishlisted = isWishlisted(event.id);
  const familiarCount = guest ? 0 : event.participants.filter(p => crossedPathsWith(p.id) > 0).length;
  const isFull = event.currentParticipants >= event.maxParticipants;
  const primaryLabel = isAttending
    ? (cancelArmed ? 'Cancel registration?' : 'Attending')
    : isFull ? 'Join Waitlist' : paid ? 'Get tickets' : 'Register';

  const disarmCancel = () => {
    if (armTimer.current) clearTimeout(armTimer.current);
    armTimer.current = null;
    setCancelArmed(false);
  };

  const cancelAutoChat = () => {
    if (chatTimer.current) clearTimeout(chatTimer.current);
    chatTimer.current = null;
  };

  useEffect(() => () => {
    if (armTimer.current) clearTimeout(armTimer.current);
    if (chatTimer.current) clearTimeout(chatTimer.current);
  }, []);

  // Just signed up from this event? Finish what they started: register,
  // open the ticket sheet or join the waitlist.
  useEffect(() => {
    if (guest) return;
    const intent = takePendingIntent(event.id);
    if (!intent) return;
    const name = getUserProfile()?.firstName;
    const t = setTimeout(() => {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (intent.action === 'tickets' && paid) {
        toast({ title: name ? `Welcome to SYNC, ${name}` : 'Welcome to SYNC', description: 'Next, get your tickets.' });
        setTicketOpen(true);
      } else if (intent.action === 'waitlist' || (isFull && !isAttending)) {
        toast({ title: name ? `Welcome to SYNC, ${name}` : 'Welcome to SYNC' });
        setWaitlistOpen(true);
      } else if (!isAttending) {
        toast({ title: name ? `Welcome to SYNC, ${name}` : 'Welcome to SYNC', description: `You're registered for ${event.title}.` });
        registerAttendance();
      }
    }, 400);
    return () => clearTimeout(t);
    // Runs once when this card first renders for a signed-in member.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guest, event.id]);

  // Reset the armed state if the user leaves the event (or re-joins elsewhere)
  useEffect(() => { if (!isAttending) disarmCancel(); }, [isAttending]);

  const handleAttend = () => {
    if (guest) {
      // Ask for an account first, right here on the event (Figma G1/G2).
      setSignupAction(isFull ? 'waitlist' : paid ? 'tickets' : 'register');
      return;
    }
    if (isFull && !isAttending) {
      setWaitlistOpen(true);
      return;
    }
    if (isAttending) {
      if (cancelArmed) {
        disarmCancel();
        setCancelOpen(true);
      } else {
        setCancelArmed(true);
        if (armTimer.current) clearTimeout(armTimer.current);
        armTimer.current = setTimeout(() => setCancelArmed(false), 4000);
      }
      return;
    }
    if (paid) {
      setTicketOpen(true);
      return;
    }
    registerAttendance();
  };

  /** Marks the person as going and opens the confirmation (and, after 10s, the group chat). */
  const registerAttendance = () => {
    toggleAttending(event.id);
    onAttend?.(event.id);
    ensureGroupChat(event.id, seedGroupChat(event));
    setConfirmOpen(true);
    // Drop the user into the event group chat 10s after registering
    if (onOpenGroupChat) {
      cancelAutoChat();
      chatTimer.current = setTimeout(() => {
        chatTimer.current = null;
        setConfirmOpen(false);
        setDetailsOpen(false);
        onOpenGroupChat(event);
      }, 10_000);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    void shareEvent(event, toast);
  };

  const confirmCancel = () => {
    disarmCancel();
    cancelAutoChat();
    setCancelOpen(false);
    toggleAttending(event.id);
    onAttend?.(event.id);
    toast(registrationCancelledToast(event));
  };

  return (
    <div
      ref={cardRef}
      className="group bg-event-card text-event-card-foreground rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image / attendee photo carousel */}
      <EventPhotoCarousel eventId={event.id} fallbackUrl={event.imageUrl} alt={event.title}>
        {/* No top pills: listing source, partner status and category are not shown on the card.
            Partners surface through the Featured section and carousel order; category is implied
            by the interest filter (onboarding or the sticky bar). */}

        {/* Image pills (Figma "pill: vibe"): sage fill, cream label, full pill */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 flex-nowrap overflow-hidden [&>span]:shrink-0 [&>span]:whitespace-nowrap">
          <span
            data-tour="vibe"
            title={vibeMeta(event.vibe).description}
            className="flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-semibold bg-sage-deep text-event-card"
          >
            <span aria-hidden>{vibeMeta(event.vibe).emoji}</span>
            {vibeMeta(event.vibe).label}
          </span>
          {event.womenOnly && (
            <span className="flex items-center h-7 px-3 rounded-full text-xs font-semibold bg-pink-700 text-pink-50">Women only</span>
          )}
          {event.lgbtqFriendly && (
            <span className="flex items-center h-7 px-3 rounded-full text-xs font-semibold bg-purple-700 text-purple-50">LGBTQ+ friendly</span>
          )}
          {event.petFriendly && (
            <span className="flex items-center h-7 px-3 rounded-full text-xs font-semibold bg-emerald-800 text-emerald-50">Pet friendly</span>
          )}
          {event.trending && (
            <span
              role="img"
              aria-label="Trending"
              title="Trending"
              className="h-7 w-7 rounded-full bg-sage-deep text-event-card flex items-center justify-center"
            >
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          )}
          {/* Price (Figma option B): cream tag on the photo, right-aligned */}
          {price && (
            <span className="ml-auto flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-bold bg-event-card text-primary-text">
              <Ticket className="h-3.5 w-3.5" aria-hidden="true" />
              {price.label}
            </span>
          )}
        </div>
      </EventPhotoCarousel>

      {/* Content: matches the Figma "event card template" (Default variant) */}
      <div className="p-5 md:p-6">
        <div className="flex flex-col gap-3 md:gap-4">
          {/* Title row + organiser */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <h3
                role="button"
                tabIndex={0}
                aria-label={`View details for ${event.title}`}
                onClick={(e) => { e.stopPropagation(); setDetailsOpen(true); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    setDetailsOpen(true);
                  }
                }}
                // Always two lines tall, so every card lines up; a smaller size fits
                // titles of up to about 10 words without "…".
                className="text-base md:text-[17px] font-semibold leading-snug tracking-[-0.01em] text-primary-text line-clamp-2 min-h-[2.75em] [text-wrap:pretty] cursor-pointer hover:underline"
              >
                {event.title}
              </h3>
              <div className="flex items-center gap-0.5 shrink-0 -mr-1.5 -mt-0.5">
                {!guest && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleWishlist(event.id); }}
                    aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
                    aria-pressed={wishlisted}
                    className="h-8 w-8 rounded-full flex items-center justify-center text-primary-text hover:bg-primary/10 transition-colors"
                  >
                    <Heart className={cn('h-[18px] w-[18px]', wishlisted && 'fill-current')} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleShare}
                  aria-label={`Share ${event.title}`}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-primary-text hover:bg-primary/10 transition-colors"
                >
                  <Forward className="h-[18px] w-[18px]" />
                </button>
              </div>
            </div>
            {/* The organiser line is always there, so cards keep the same height. */}
            <div className="mt-0.5 min-h-[1.375em] text-sm md:text-base leading-snug">
              {event.organizer && (
                <OrganizerPopover
                  organizer={event.organizer}
                  className="font-semibold leading-snug text-sage-deep text-left hover:underline underline-offset-2"
                />
              )}
            </div>
          </div>

          {/* Attendees + familiar faces (no counts: organiser-only, V2) */}
          {(event.participants.length > 0 || familiarCount > 0 || isFull) && (
            <div className="flex items-center gap-3 flex-wrap">
              <ParticipantAvatars
                participants={event.participants}
                maxVisible={4}
                avatarClassName="w-6 h-6 border border-sage"
                onParticipantClick={onParticipantClick}
              />
              {familiarCount > 0 && (
                <span className="inline-flex items-center h-6 px-2.5 rounded-full border border-sage-deep bg-sage/20 text-xs font-semibold text-sage-deep">
                  {familiarCount} familiar {familiarCount === 1 ? 'face' : 'faces'}
                </span>
              )}
              {isFull && (
                <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-destructive/10 text-destructive">Full</span>
              )}
            </div>
          )}

          <p className="text-sm md:text-[15px] leading-relaxed text-foreground line-clamp-2">
            {event.description}
          </p>

          {/* Date + time on one line, venue below */}
          <div className="flex flex-col gap-1 text-sm font-semibold leading-snug text-sage-deep">
            <div className="flex items-center justify-between gap-3 whitespace-nowrap">
              <span className="flex items-center gap-2">
                <Calendar06 className="h-4 w-4 shrink-0 text-primary-text" />
                {format(event.date, 'EEE, MMM d')}
              </span>
              <span className="flex items-center gap-2">
                <Clock01 className="h-4 w-4 shrink-0 text-primary-text" />
                {startTime24(event.time)}
              </span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Marker02 className="h-4 w-4 shrink-0 text-primary-text" />
              <span className="truncate">{event.location}</span>
            </div>
          </div>
        </div>

        {/* Back from the ticket site (Figma "2 · Back on SYNC"): ask once, in place of the buttons */}
        {paid && ticketPending && !isAttending && !guest ? (
          <div className="mt-4 md:mt-5 rounded-xl border border-sage bg-sage/20 px-4 py-3.5 flex flex-col gap-2.5">
            <p className="font-display text-[15px] font-semibold text-foreground">Got your ticket?</p>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Mark yourself as going to join the group chat and see who else will be there.
            </p>
            <div className="flex gap-2.5">
              <Button
                variant="outline"
                className="flex-1 h-9 text-sm font-medium bg-transparent border-primary-text text-primary-text hover:bg-primary-text/5 hover:text-primary-text"
                onClick={(e) => { e.stopPropagation(); markTicketPending(false); }}
              >
                Not yet
              </Button>
              <Button
                className="flex-1 h-9 text-sm font-medium shadow-none"
                onClick={(e) => { e.stopPropagation(); markTicketPending(false); registerAttendance(); }}
              >
                I'm going
              </Button>
            </div>
            <button
              type="button"
              className="self-center text-sm font-semibold text-primary-text hover:underline underline-offset-2"
              onClick={(e) => { e.stopPropagation(); setTicketOpen(true); }}
            >
              Open the ticket site again
            </button>
          </div>
        ) : (
        /* Actions (Figma "Primary Action - Register"): secondary left, primary right, no icons */
        <div className="mt-4 md:mt-5 flex gap-2.5" onMouseLeave={disarmCancel}>
          <Button
            variant="outline"
            className="flex-1 h-9 text-sm font-medium bg-transparent border-primary-text text-primary-text hover:bg-primary-text/5 hover:text-primary-text"
            onClick={(e) => { e.stopPropagation(); setDetailsOpen(true); }}
          >
            View more
          </Button>
          <Button
            variant={isAttending ? (cancelArmed ? 'destructive' : 'attend') : 'default'}
            className="flex-1 h-9 text-sm font-medium shadow-none"
            onClick={handleAttend}
            onBlur={() => cancelArmed && disarmCancel()}
          >
            {primaryLabel}
          </Button>

          {isAttending && onOpenGroupChat && (
            <Button
              variant="outline"
              className="h-9 px-3"
              onClick={() => onOpenGroupChat(event)}
              title="Open group chat"
              aria-label="Open group chat"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          )}
        </div>
        )}

        {/* Invite friends, once you're going */}
        {isAttending && !guest && (
          <div className="mt-3 flex flex-col gap-2">
            <InvitedSummary event={event} />
            <Button
              variant="outline"
              className="w-full border-2 border-primary text-primary-text bg-primary/5 hover:bg-primary/10 hover:text-primary-text"
              onClick={(e) => { e.stopPropagation(); setInviteOpen(true); }}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {getInvited(event.id).length ? 'Invite more' : 'Invite friends'}
            </Button>
          </div>
        )}
      </div>

      <AttendConfirmationDialog event={event} open={confirmOpen} onOpenChange={setConfirmOpen} onEngage={cancelAutoChat} />
      <InviteFriendsDialog event={event} open={inviteOpen} onOpenChange={setInviteOpen} />
      <WaitlistDialog event={event} open={waitlistOpen} onOpenChange={setWaitlistOpen} />
      {signupAction && (
        <SignupSheet
          event={event}
          action={signupAction}
          priceLabel={price?.label}
          open={!!signupAction}
          onOpenChange={(o) => { if (!o) setSignupAction(null); }}
        />
      )}
      <TicketSheet
        event={event}
        price={price}
        open={ticketOpen}
        onOpenChange={setTicketOpen}
        onContinue={() => { markTicketPending(true); setDetailsOpen(false); }}
      />
      <CancelRegistrationDialog
        event={event}
        open={cancelOpen}
        onOpenChange={(o) => { setCancelOpen(o); if (!o) disarmCancel(); }}
        onConfirm={confirmCancel}
      />

      <EventDetailsModal
        event={event}
        open={detailsOpen}
        onOpenChange={(o) => { setDetailsOpen(o); if (!o) disarmCancel(); }}
        isAttending={isAttending}
        cancelArmed={cancelArmed}
        onAttend={handleAttend}
        primaryLabel={primaryLabel}
        priceLabel={price?.label}
        onOpenGroupChat={onOpenGroupChat}
        onParticipantClick={onParticipantClick}
        guest={guest}
      />
    </div>
  );
};

export default EventCard;
