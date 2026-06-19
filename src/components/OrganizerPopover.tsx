import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Organizer } from '@/types/event';
import { Star, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface OrganizerPopoverProps {
  organizer: Organizer;
}

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[0, 1, 2, 3, 4].map(i => {
        const filled = i < full || (i === full && hasHalf);
        return (
          <Star
            key={i}
            style={{ width: size, height: size }}
            className={filled ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}
          />
        );
      })}
    </div>
  );
}

const OrganizerPopover = ({ organizer }: OrganizerPopoverProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-sm text-muted-foreground hover:text-primary underline-offset-2 hover:underline transition-colors text-left"
          onClick={(e) => e.stopPropagation()}
        >
          by <span className="font-medium">{organizer.name}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            {organizer.avatar && (
              <img
                src={organizer.avatar}
                alt={organizer.name}
                className="h-12 w-12 rounded-full object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-foreground truncate">{organizer.name}</h4>
              <p className="text-xs text-muted-foreground capitalize">{organizer.type === 'company' ? 'Organization' : 'Host'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <StarRating rating={organizer.rating} />
            <span className="text-sm font-semibold text-foreground">{organizer.rating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({organizer.reviewCount} reviews)</span>
          </div>

          <div className="flex flex-col gap-1.5 mt-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-destructive shrink-0" />
              <span>{organizer.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{organizer.eventsHosted} events hosted</span>
            </div>
          </div>
        </div>

        {organizer.recentReview && (
          <div className="p-4 bg-secondary/40">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-foreground">Most recent review</span>
              <StarRating rating={organizer.recentReview.rating} size={12} />
            </div>
            <p className="text-sm text-foreground/90 italic leading-snug">"{organizer.recentReview.text}"</p>
            <p className="text-xs text-muted-foreground mt-2">
              — {organizer.recentReview.author} · {format(organizer.recentReview.date, 'MMM d')}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default OrganizerPopover;
