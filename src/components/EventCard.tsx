import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Event, Participant } from '@/types/event';
import { MessageSquare, Heart, TrendingUp, UserPlus, Forward } from 'lucide-react';
import { format } from 'date-fns';
import ParticipantAvatars from './ParticipantAvatars';
import OrganizerPopover from './OrganizerPopover';
import EventDetailsModal from './EventDetailsModal';
import EventPhotoCarousel from './EventPhotoCarousel';
import AttendConfirmationDialog from './AttendConfirmationDialog';
import CancelRegistrationDialog from './CancelRegistrationDialog';
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
import { shareEvent } from '@/lib/shareEvent';
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
  const { getInvited } = useInvites();
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { crossedPathsWith } = useActivityHistory();
  const { toast } = useToast();
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();
  const wishlisted = isWishlisted(event.id);
  const familiarCount = guest ? 0 : event.participants.filter(p => crossedPathsWith(p.id) > 0).length;
  const isFull = event.currentParticipants >= event.maxParticipants;

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

  // Reset the armed state if the user leaves the event (or re-joins elsewhere)
  useEffect(() => { if (!isAttending) disarmCancel(); }, [isAttending]);

  const handleAttend = () => {
    if (guest) {
      navigate('/onboarding');
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
  };

  return (
    <div
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
                className="text-lg md:text-xl font-semibold leading-snug tracking-[-0.01em] text-primary-text line-clamp-2 cursor-pointer hover:underline"
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
            {event.organizer && (
              <OrganizerPopover
                organizer={event.organizer}
                className="mt-0.5 text-sm md:text-base font-semibold leading-snug text-sage-deep text-left hover:underline underline-offset-2"
              />
            )}
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
                  {familiarCount} Familiar {familiarCount === 1 ? 'Face' : 'Faces'}
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

        {/* Actions (Figma "Primary Action - Register"): secondary left, primary right, no icons */}
        <div className="mt-4 md:mt-5 flex gap-2.5" onMouseLeave={disarmCancel}>
          <Button
            variant="outline"
            className="flex-1 h-9 text-sm font-medium bg-peach border-primary-text text-primary-text hover:bg-peach hover:brightness-95 hover:text-primary-text"
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
            {isAttending ? (cancelArmed ? 'Cancel registration?' : 'Attending') : isFull ? 'Join Waitlist' : 'Register'}
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
        onOpenGroupChat={onOpenGroupChat}
        onParticipantClick={onParticipantClick}
        guest={guest}
      />
    </div>
  );
};

export default EventCard;
