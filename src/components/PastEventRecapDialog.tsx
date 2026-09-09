import { useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, Heart, Star, ImagePlus } from 'lucide-react';
import { format } from 'date-fns';
import { PastAttendance, Participant } from '@/types/event';
import { mockParticipants } from '@/data/mockData';
import { useEventMedia } from '@/context/EventMediaContext';
import { getUserProfile } from '@/lib/userProfile';
import { bannerForPastEvent } from '@/lib/pastEventPhotos';
import EventPhotoCarousel from './EventPhotoCarousel';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Props {
  attendance: PastAttendance;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onParticipantClick?: (p: Participant) => void;
}

/**
 * Retroactive event view for an event the user already attended: attendee
 * photos and selfies, likeable, with the most-liked photo featured as banner.
 */
const PastEventRecapDialog = ({ attendance, open, onOpenChange, onParticipantClick }: Props) => {
  const { photosFor, toggleLike, addPhoto } = useEventMedia();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState('');
  const photos = photosFor(attendance.eventId);
  const banner = bannerForPastEvent(attendance.seriesId);

  const attendees = attendance.coAttendeeIds
    .map(id => mockParticipants.find(p => p.id === id))
    .filter(Boolean) as Participant[];

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const profile = getUserProfile();
      addPhoto({
        eventId: attendance.eventId,
        url: String(reader.result),
        caption: caption.trim() || undefined,
        ownerId: 'me',
        ownerName: profile ? `${profile.firstName} ${profile.lastName}`.trim() : 'You',
        ownerAvatar: profile?.photo,
      });
      setCaption('');
      toast({
        title: 'Photo added to the recap',
        description: 'The most-liked photo becomes the event banner.',
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <EventPhotoCarousel
          eventId={attendance.eventId}
          fallbackUrl={banner}
          alt={attendance.title}
          className="h-56 shrink-0"
        >
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="px-2 py-1 rounded-md text-xs font-semibold bg-success/90 text-vivid-foreground">
              You attended
            </span>
            <span className="px-2 py-1 rounded-md text-xs font-medium bg-white/90 text-foreground">
              {attendance.category}
            </span>
          </div>
          <div className="absolute bottom-3 left-4 right-4 text-white pointer-events-none">
            <h2 className="text-xl font-bold leading-tight mb-1">{attendance.title}</h2>
            <div className="flex items-center gap-3 text-xs text-white/90 flex-wrap">
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{format(attendance.date, 'EEE, MMM d yyyy')}</span>
              {attendance.location && (
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{attendance.location}</span>
              )}
              {attendance.attendeeCount && (
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{attendance.attendeeCount} went</span>
              )}
            </div>
          </div>
        </EventPhotoCarousel>

        <div className="overflow-y-auto px-6 py-5 space-y-6">
          {/* Attendee photos */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground">
                Photos from attendees {photos.length > 0 && `(${photos.length})`}
              </h3>
              <span className="text-xs text-muted-foreground">Most liked becomes the banner</span>
            </div>

            {photos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No photos yet — be the first to add one from this event.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((p, i) => (
                  <figure key={p.id} className="rounded-xl overflow-hidden border bg-card">
                    <div className="relative">
                      <img src={p.url} alt={p.caption || attendance.title} className="w-full h-28 object-cover" />
                      {i === 0 && (
                        <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-accent text-accent-foreground">
                          <Star className="h-3 w-3" /> Featured
                        </span>
                      )}
                    </div>
                    <figcaption className="p-2">
                      {p.caption && <p className="text-[11px] text-foreground truncate">{p.caption}</p>}
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className="text-[11px] text-muted-foreground truncate">📷 {p.ownerName}</span>
                        <button
                          type="button"
                          onClick={() => toggleLike(p.id)}
                          aria-label={p.likedByMe ? `Unlike photo by ${p.ownerName}` : `Like photo by ${p.ownerName}`}
                          aria-pressed={p.likedByMe}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground"
                        >
                          <Heart className={cn('h-3.5 w-3.5', p.likedByMe && 'fill-destructive text-destructive')} />
                          {p.likes}
                        </button>
                      </div>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </section>

          {/* Add your own */}
          <section className="rounded-xl border bg-muted/30 p-3 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Add your photo or selfie</h3>
            <input
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Add a caption (optional)"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <ImagePlus className="h-4 w-4 mr-1" /> Upload photo
            </Button>
          </section>

          {/* Who was there */}
          {attendees.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-2">Who was there</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {attendees.map(p => (
                  <button
                    key={p.id}
                    onClick={() => onParticipantClick?.(p)}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/60 transition text-left"
                  >
                    <img src={p.avatar} alt={p.name} className="w-9 h-9 rounded-full object-cover" />
                    <span className="text-sm font-medium truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PastEventRecapDialog;
