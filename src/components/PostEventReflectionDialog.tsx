import { useState, useEffect, useMemo, useRef } from 'react';
import { Event, Participant } from '@/types/event';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, MessageCircle, Lock, Camera, ImagePlus, Heart } from 'lucide-react';
import { useActivityHistory } from '@/context/ActivityHistoryContext';
import { useEventRatings, FriendRating } from '@/context/EventRatingContext';
import { useEventMedia } from '@/context/EventMediaContext';
import { getUserProfile } from '@/lib/userProfile';
import { useToast } from '@/hooks/use-toast';
import { mockParticipants } from '@/data/mockData';

interface Props {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenDM?: (participantId: string, metAtEventTitle?: string) => void;
}

const RATING_OPTIONS: { value: FriendRating; emoji: string; label: string; hint: string }[] = [
  { value: 'definitely', emoji: '🙌', label: 'Definitely', hint: "I'd bring a friend next time" },
  { value: 'maybe', emoji: '🤔', label: 'Maybe', hint: 'Depends on the crowd' },
  { value: 'no', emoji: '👎', label: 'Probably not', hint: 'Not my thing' },
];

type Step = 'rate' | 'pick' | 'photo' | 'chat';

/** Three small dots under the buttons: where you are in the three optional steps, without a "Step N of 3" label. */
const StepDots = ({ current }: { current: 1 | 2 | 3 }) => (
  <div className="mt-4 flex justify-center gap-2" role="img" aria-label={`Step ${current} of 3`}>
    {[1, 2, 3].map(n => (
      <span
        key={n}
        className={`h-1.5 w-1.5 rounded-full ${n === current ? 'bg-[#C1694F]' : 'bg-border'}`}
      />
    ))}
  </div>
);

const PostEventReflectionDialog = ({ event, open, onOpenChange, onOpenDM }: Props) => {
  const { tagAttendee, hasTaggedMe } = useActivityHistory();
  const { rateEvent } = useEventRatings();
  const { addPhoto } = useEventMedia();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('rate');
  const [rating, setRating] = useState<FriendRating | null>(null);
  const [comment, setComment] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [tagged, setTagged] = useState<Participant[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState('');

  useEffect(() => {
    if (open) {
      setStep('rate');
      setRating(null);
      setComment('');
      setPicked([]);
      setTagged([]);
      setPhotoUrl(null);
      setPhotoCaption('');
    }
  }, [open, event?.id]);

  // Everyone the user could have met at this event: confirmed co-attendees first,
  // then the rest of the attendee pool.
  const options = useMemo<Participant[]>(() => {
    const base = event?.participants ?? [];
    const seen = new Set(base.map(p => p.id));
    const extra = mockParticipants.filter(p => !seen.has(p.id));
    return [...base, ...extra];
  }, [event?.participants]);

  if (!event) return null;

  const toggle = (id: string) => {
    setPicked(prev => prev.includes(id)
      ? prev.filter(x => x !== id)
      : prev.length >= 3 ? prev : [...prev, id]);
  };

  const submitRating = () => {
    if (!rating) return;
    rateEvent(event.id, rating, comment.trim() || undefined);
    setStep('pick');
  };

  const submitTags = () => {
    picked.forEach(id => tagAttendee({
      participantId: id,
      eventId: event.id,
      eventTitle: event.title,
      taggedAt: new Date(),
    }));
    setTagged(options.filter(p => picked.includes(p.id)));
    const mutuals = picked.filter(hasTaggedMe);
    toast({
      title: `Tagged ${picked.length} ${picked.length === 1 ? 'person' : 'people'}`,
      description: mutuals.length > 0
        ? `${mutuals.length} of them tagged you back. DMs unlocked.`
        : 'Stays private. If they tag you too, DMs unlock automatically.',
    });
    setStep('photo');
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const finishPhoto = (post: boolean) => {
    if (post && photoUrl) {
      const profile = getUserProfile();
      addPhoto({
        eventId: event.id,
        url: photoUrl,
        caption: photoCaption.trim() || undefined,
        ownerId: 'me',
        ownerName: profile ? `${profile.firstName} ${profile.lastName}`.trim() : 'You',
        ownerAvatar: profile?.photo,
      });
      toast({
        title: 'Photo posted',
        description: 'It now headlines the event card. The most-liked photo gets featured first.',
      });
    }
    const mutuals = picked.filter(hasTaggedMe);
    if (mutuals.length > 0) {
      setStep('chat');
      return;
    }
    onOpenChange(false);
  };

  const startChat = (p: Participant) => {
    onOpenChange(false);
    onOpenDM?.(p.id, event.title);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {step === 'rate' && (
          <>
            <DialogHeader>
              <DialogTitle>Would you bring a friend to {event.title} next time?</DialogTitle>
              <DialogDescription>
                Your answer powers the “friend-worthy” score other members see.
              </DialogDescription>
            </DialogHeader>

<div className="py-2">
              <div className="grid grid-cols-3 gap-2">
                {RATING_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRating(opt.value)}
                    className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition ${
                      rating === opt.value
                        ? 'border-primary bg-primary/10 ring-1 ring-primary'
                        : 'border-border hover:bg-secondary'
                    }`}
                  >
                    <span className="text-2xl leading-none">{opt.emoji}</span>
                    <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                    <span className="text-[11px] leading-tight text-muted-foreground">{opt.hint}</span>
                    {rating === opt.value && (
                      <span className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <Input
                className="mt-3"
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Add a one-line note (optional)"
                maxLength={120}
              />
            </div>

            <div className="flex gap-2 mt-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Skip</Button>
              <Button className="flex-1" disabled={!rating} onClick={submitRating}>Next</Button>
            </div>
            <StepDots current={1} />
          </>
        )}

        {step === 'pick' && (
          <>
            {/* Centred; progress is shown by the dots under the buttons. */}
            <DialogHeader className="items-center text-center sm:text-center">
              {/* The instruction is the heading: the notification that opens this already asks "Who did you click with?" */}
              <DialogTitle className="text-xl font-semibold leading-7 text-[#C1694F]">Tag up to 3 people</DialogTitle>
              <DialogDescription className="text-center">
                <span className="block">from {event.title} you'd like to see again.</span>
                <span className="mt-3 block">If they tag you back, your conversation unlocks.</span>
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-3 py-2 max-h-[320px] overflow-y-auto">
              {options.map(p => {
                const selected = picked.includes(p.id);
                return (
                  // Selected: a white tile lifted by the event cards' soft shadow; no tick, no outline.
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggle(p.id)}
                    className={`relative flex flex-col items-center gap-2 p-2 rounded-xl transition ${
                      selected ? 'bg-card shadow-card' : 'hover:bg-secondary'
                    }`}
                  >
                    <img src={p.avatar} alt="" className="w-14 h-14 rounded-full object-cover" />
                    <span className="text-xs text-foreground line-clamp-1 w-full text-center">{p.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Between the tiles and the button, so the count sits next to the action it enables. */}
            <p className="text-center text-xs font-medium text-muted-foreground">{picked.length} of 3 selected</p>

            {/* One clear action; the way out is a quiet, honest text link rather than a second button. */}
            <div className="mt-2 flex flex-col items-center">
              <Button className="h-12 w-full text-base font-normal" disabled={picked.length === 0} onClick={submitTags}>
                Tag {picked.length || ''} {picked.length === 1 ? 'person' : picked.length ? 'people' : ''}
              </Button>
              <button
                type="button"
                onClick={() => setStep('photo')}
                className="mt-3 flex min-h-11 items-center rounded px-3 text-base text-[#974B35] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                No one this time
              </button>
            </div>
            <StepDots current={2} />
          </>
        )}

        {step === 'photo' && (
          <>
            <DialogHeader>
              <DialogTitle>Share a photo from {event.title}</DialogTitle>
              <DialogDescription>
                Your photo headlines the event card. The most-liked photo gets featured first, credited to whoever posted it.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={onPickFile}
              />
              {photoUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <img src={photoUrl} alt="Event photo preview" className="w-full h-48 object-cover" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute bottom-2 right-2 bg-background/90"
                    onClick={() => fileRef.current?.click()}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-40 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-secondary transition"
                >
                  <span className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    <ImagePlus className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium">Take or upload a photo</span>
                </button>
              )}

              <Input
                value={photoCaption}
                onChange={e => setPhotoCaption(e.target.value)}
                placeholder="Caption (optional)"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Heart className="h-3 w-3" /> Attendees can like photos. The top one leads the carousel.
              </p>
            </div>

            <div className="flex gap-2 mt-2">
              <Button variant="outline" className="flex-1" onClick={() => finishPhoto(false)}>Skip</Button>
              <Button className="flex-1" disabled={!photoUrl} onClick={() => finishPhoto(true)}>Post photo</Button>
            </div>
            <StepDots current={3} />
          </>
        )}

        {step === 'chat' && (
          <>
            <DialogHeader>
              <DialogTitle>Start a private chat?</DialogTitle>
              <DialogDescription>
                Message anyone who tagged you back. The rest stay private until they tag you too.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2">
              {tagged.map(p => {
                const mutual = hasTaggedMe(p.id);
                return (
                  <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl border border-border">
                    <img src={p.avatar} alt={p.name} className="w-10 h-10 rounded-full object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {mutual ? 'Tagged you back. DMs unlocked' : 'Waiting for them to tag you'}
                      </p>
                    </div>
                    {mutual ? (
                      <Button size="sm" onClick={() => startChat(p)}>
                        <MessageCircle className="h-3.5 w-3.5 mr-1" />
                        Message
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled>
                        <Lock className="h-3.5 w-3.5 mr-1" />
                        Locked
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 mt-2">
              <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PostEventReflectionDialog;
