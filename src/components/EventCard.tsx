import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Event, Participant } from '@/types/event';
import { Calendar, MapPin, Users, Clock, ArrowRight, Check, MessageSquare, Repeat, Heart } from 'lucide-react';
import { format } from 'date-fns';
import ParticipantAvatars from './ParticipantAvatars';
import OrganizerPopover from './OrganizerPopover';
import EventDetailsModal from './EventDetailsModal';
import AttendConfirmationDialog from './AttendConfirmationDialog';
import { useActivityHistory } from '@/context/ActivityHistoryContext';
import { useWishlist } from '@/context/WishlistContext';
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

const sourceColors = {
  meetup: 'bg-red-500',
  eventbrite: 'bg-orange-500',
  luma: 'bg-purple-500',
};

const activityColors = {
  low: 'bg-activity-low',
  moderate: 'bg-activity-moderate',
  high: 'bg-activity-high',
};

const intensityLabels = {
  chill: '😌 Chill',
  social: '💬 Social',
  energetic: '⚡ Energetic',
};

const EventCard = ({ event, onAttend, onParticipantClick, onOpenGroupChat, guest = false }: EventCardProps) => {
  const [isAttending, setIsAttending] = useState(event.isAttending || false);
  const [, setIsHovered] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { seriesCount, crossedPathsWith } = useActivityHistory();
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();
  const wishlisted = isWishlisted(event.id);
  const seriesTimes = guest ? 0 : seriesCount(event.seriesId);
  const familiarCount = guest ? 0 : event.participants.filter(p => crossedPathsWith(p.id) > 0).length;

  const handleAttend = () => {
    setIsAttending(!isAttending);
    onAttend?.(event.id);
  };

  return (
    <div
      className="group bg-card rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={event.imageUrl}
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Source badge */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className={`px-2 py-1 rounded-md text-xs font-semibold text-white ${sourceColors[event.source]}`}>
            {event.source.charAt(0).toUpperCase() + event.source.slice(1)}
          </span>
          <span className="px-2 py-1 rounded-md text-xs font-medium bg-white/90 text-foreground">
            {event.category}
          </span>
        </div>

        {/* Activity & Intensity badges */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <span className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-white ${activityColors[event.activityLevel]}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
            {event.activityLevel.charAt(0).toUpperCase() + event.activityLevel.slice(1)}
          </span>
          <span className="px-2 py-1 rounded-md text-xs font-medium bg-white/90 text-foreground">
            {intensityLabels[event.intensity]}
          </span>
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
      </div>

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
            <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-accent/15 text-accent">
              {familiarCount} familiar {familiarCount === 1 ? 'face' : 'faces'}
            </span>
          )}
        </div>
        <h3 className="text-lg font-bold text-foreground mb-1 line-clamp-1 group-hover:text-primary transition-colors">
          {event.title}
        </h3>
        {event.organizer && (
          <div className="mb-2">
            <OrganizerPopover organizer={event.organizer} />
          </div>
        )}

        <p className="text-sm text-muted-foreground mb-1 line-clamp-2">
          {event.description}
        </p>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setDetailsOpen(true); }}
          className="text-xs font-medium text-primary hover:underline mb-4 inline-flex items-center gap-1"
        >
          View more <ArrowRight className="h-3 w-3" />
        </button>

        {/* Details */}
        <div className="flex flex-col gap-2 mb-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span>{format(event.date, 'EEEE, MMMM d')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent" />
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
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant={isAttending ? 'attend' : 'default'}
            className="flex-1"
            onClick={handleAttend}
          >
            {isAttending ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Attending
              </>
            ) : (
              <>
                Attend
                <ArrowRight className="h-4 w-4 ml-1" />
              </>
            )}
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

      <EventDetailsModal
        event={event}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        isAttending={isAttending}
        onAttend={handleAttend}
        onOpenGroupChat={onOpenGroupChat}
        onParticipantClick={onParticipantClick}
        guest={guest}
      />
    </div>
  );
};

export default EventCard;
