import { useState } from 'react';
import { Heart, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useEventMedia } from '@/context/EventMediaContext';
import { cn } from '@/lib/utils';

interface Props {
  eventId: string;
  fallbackUrl: string;
  alt: string;
  className?: string;
  /** Overlay children (badges) rendered on top of the media. */
  children?: React.ReactNode;
}

/**
 * Event banner: attendee-uploaded photos as a likeable carousel, ranked by
 * engagement. Falls back to the event's original banner when nobody posted yet.
 */
const EventPhotoCarousel = ({ eventId, fallbackUrl, alt, className, children }: Props) => {
  const { photosFor, toggleLike } = useEventMedia();
  const photos = photosFor(eventId);
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const safeIndex = photos.length ? Math.min(index, photos.length - 1) : 0;
  const current = photos[safeIndex];

  const go = (delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex(prev => {
      const next = (prev + delta + photos.length) % photos.length;
      return next;
    });
  };

  return (
    <>
      <div className={cn('relative h-48 overflow-hidden', className)}>
        <img
          src={current?.url ?? fallbackUrl}
          alt={current?.caption || alt}
          onClick={current ? () => setLightbox(true) : undefined}
          className={cn(
            'w-full h-full object-cover transition-transform duration-500 group-hover:scale-105',
            current && 'cursor-zoom-in'
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

        {children}

        {current && (
          <>
            {safeIndex === 0 && (
              <span className="absolute top-14 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-accent text-accent-foreground">
                <Star className="h-3 w-3" /> Top photo
              </span>
            )}

            {/* Owner credit + likes */}
            <div className="absolute bottom-12 left-3 right-3 flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-white/90 truncate drop-shadow">
                📷 by {current.ownerName}
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleLike(current.id); }}
                aria-label={current.likedByMe ? 'Unlike photo' : 'Like photo'}
                aria-pressed={current.likedByMe}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/90 hover:bg-white shadow-sm text-xs font-semibold text-foreground"
              >
                <Heart className={cn('h-3.5 w-3.5', current.likedByMe && 'fill-destructive text-destructive')} />
                {current.likes}
              </button>
            </div>

            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => go(-1, e)}
                  aria-label="Previous photo"
                  className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/85 hover:bg-white flex items-center justify-center"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => go(1, e)}
                  aria-label="Next photo"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/85 hover:bg-white flex items-center justify-center"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1">
                  {photos.map((p, i) => (
                    <span
                      key={p.id}
                      className={cn('h-1.5 w-1.5 rounded-full', i === safeIndex ? 'bg-white' : 'bg-white/50')}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {current && (
        <Dialog open={lightbox} onOpenChange={setLightbox}>
          <DialogContent className="max-w-2xl p-0 overflow-hidden">
            <img src={current.url} alt={current.caption || alt} className="w-full max-h-[70vh] object-contain bg-black" />
            <div className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-foreground">{current.caption || alt}</p>
                <p className="text-xs text-muted-foreground mt-1">Posted by {current.ownerName}</p>
              </div>
              <button
                type="button"
                onClick={() => toggleLike(current.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm font-semibold"
              >
                <Heart className={cn('h-4 w-4', current.likedByMe && 'fill-destructive text-destructive')} />
                {current.likes}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default EventPhotoCarousel;
