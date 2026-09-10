import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Event, Participant } from '@/types/event';
import { Calendar, MapPin, Users, Clock, ArrowRight, Check, MessageSquare, Repeat, Heart, TrendingUp, Hourglass, X } from 'lucide-react';
import { format } from 'date-fns';
import ParticipantAvatars from './ParticipantAvatars';
import OrganizerPopover from './OrganizerPopover';
import EventDetailsModal from './EventDetailsModal';
import EventPhotoCarousel from './EventPhotoCarousel';
import { useEventRatings } from '@/context/EventRatingContext';
import AttendConfirmationDialog from './AttendConfirmationDialog';
import CancelRegistrationDialog from './CancelRegistrationDialog';
import WaitlistDialog from './WaitlistDialog';
import { useActivityHistory } from '@/context/ActivityHistoryContext';
import { useWishlist } from '@/context/WishlistContext';
import { useAttending } from '@/context/AttendingContext';
import { useSocial } from '@/context/SocialContext';
import { seedGroupChat } from '@/lib/groupChatSeed';
import { cn } from '@/lib/utils';

interface EventCardProps {
  event: Event;
  onAttend?: (eventId: string) => void;
  onParticipantClick?: (participant: Participant) => void;
  onOpenGroupChat?: (event: Event) => void;
  guest?: boolean;
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const sourceColors: Record<string, string> = {
  meetup: 'bg-red-700 text-red-50',
  eventbrite: 'bg-orange-700 text-orange-50',
  luma: 'bg-purple-700 text-purple-50',
  'agenda-porto': 'bg-teal-800 text-teal-50',
};

/** Display names for each listing site. */
export const sourceLabels: Record<string, string> = {
  meetup: 'Meetup',
  eventbrite: 'Eventbrite',
  luma: 'Lu.ma',
  'agenda-porto': 'Agenda Porto',
};

const activityColors = {
  low: 'bg-activity-low text-vivid-foreground',
  moderate: 'bg-activity-moderate text-vivid-ink',
  high: 'bg-activity-high text-vivid-foreground',
};


const intensityLabels = {
  chill: '😌 Chill',
  social: '💬 Social',
  energetic: '⚡ Energetic',
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
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { seriesCount, crossedPathsWith } = useActivityHistory();
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();
  const { friendScore } = useEventRatings();
  const wishlisted = isWishlisted(event.id);
  const seriesTimes = guest ? 0 : seriesCount(event.seriesId);
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
        {/* Source badge */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className={`px-2 py-1 rounded-md text-xs font-semibold ${sourceColors[event.source]}`}>
            {event.source.charAt(0).toUpperCase() + event.source.slice(1)}
          </span>
          <span className="px-2 py-1 rounded-md text-xs font-medium bg-card/95 text-card-foreground">
            {event.category}
          </span>
        </div>

        {/* Activity & Intensity badges */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 flex-wrap">
          <span className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${activityColors[event.activityLevel]}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
            {event.activityLevel.charAt(0).toUpperCase() + event.activityLevel.slice(1)}
          </span>
          <span className="px-2 py-1 rounded-md text-xs font-medium bg-card/95 text-card-foreground">
            {intensityLabels[event.intensity]}
          </span>
          {event.womenOnly && (
            <span className="px-2 py-1 rounded-md text-xs font-medium bg-pink-700 text-pink-50">Women only</span>
          )}
          {event.lgbtqFriendly && (
            <span className="px-2 py-1 rounded-md text-xs font-medium bg-purple-700 text-purple-50">LGBTQ+ friendly</span>
          )}
          {event.petFriendly && (
            <span className="px-2 py-1 rounded-md text-xs font-medium bg-emerald-800 text-emerald-50">Pet friendly</span>
          )}

          {event.trending && (
            <span className="px-2 py-1 rounded-md text-xs font-medium bg-accent text-accent-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Trending
            </span>
          )}
        </div>

        {/* Wishlist heart */}
        {!guest && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleWishlist(event.id); }}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
            aria-pressed={wishlisted}
            className={cn(
              'absolute top-3 right-3 h-9 w-9 rounded-full flex items-center justify-center transition-all',
              'bg-white/90 hover:bg-white shadow-md backdrop-blur-sm',
              wishlisted && 'bg-white'
            )}
          >
            <Heart
              className={cn(
                'h-5 w-5 transition-colors',
                wishlisted ? 'fill-destructive text-destructive' : 'text-foreground'
              )}
            />
          </button>
        )}
      </EventPhotoCarousel>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          {event.recurrence && event.recurrence !== 'one-off' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-primary/10 text-primary">
              <Repeat className="h-3 w-3" />
              {event.recurrence.charAt(0).toUpperCase() + event.recurrence.slice(1)}
              {seriesTimes > 0 && ` · ${ordinal(seriesTimes + 1)} time for you`}
            </span>
          )}
          {familiarCount > 0 && (
            <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-accent/15 text-accent-strong">
              {familiarCount} familiar {familiarCount === 1 ? 'face' : 'faces'}
            </span>
          )}
          {friendScore(event.id) !== null && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-primary/10 text-primary">
              <Heart className="h-3 w-3" />
              {friendScore(event.id)}% would bring a friend
            </span>
          )}
        </div>
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
          className="text-lg font-bold text-foreground mb-1 line-clamp-1 group-hover:text-primary transition-colors cursor-pointer hover:underline"
        >
          {event.title}
        </h3>
        {event.organizer && (
          <div className="mb-2">
            <OrganizerPopover organizer={event.organizer} />
          </div>
        )}

        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {event.description}
        </p>


        {/* Details */}
        <div className="flex flex-col gap-2 mb-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span>{format(event.date, 'EEEE, MMMM d')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent-strong" />
            <span>{event.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-destructive" />
            <span className="line-clamp-1">{event.location}</span>
          </div>
        </div>

        {/* Participants */}
        <div className="flex items-center justify-between mb-4">
          <ParticipantAvatars
            participants={event.participants}
            maxVisible={4}
            totalCount={event.currentParticipants}
            onParticipantClick={onParticipantClick}
          />
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{event.currentParticipants}/{event.maxParticipants}</span>
            {isFull && (
              <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-destructive/10 text-destructive">Full</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2" onMouseLeave={disarmCancel}>
          <Button
            variant={isAttending ? (cancelArmed ? 'destructive' : 'attend') : 'default'}
            className="flex-1"
            onClick={handleAttend}
            onBlur={() => cancelArmed && disarmCancel()}
          >
            {isAttending ? (
              cancelArmed ? (
                <>
                  <X className="h-4 w-4 mr-1" />
                  Cancel registration?
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Attending
                </>
              )
            ) : isFull ? (
              <>
                <Hourglass className="h-4 w-4 mr-1" />
                Join Waitlist
              </>
            ) : (
              <>
                Attend
                <ArrowRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="flex-1 bg-transparent"
            onClick={(e) => { e.stopPropagation(); setDetailsOpen(true); }}
          >
            View more
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>

          {isAttending && onOpenGroupChat && (
            <Button
              variant="outline"
              className="px-3"
              onClick={() => onOpenGroupChat(event)}
              title="Open group chat"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <AttendConfirmationDialog event={event} open={confirmOpen} onOpenChange={setConfirmOpen} />
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
