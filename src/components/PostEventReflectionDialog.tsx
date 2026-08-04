import { useState, useEffect, useMemo } from 'react';
import { Event, Participant } from '@/types/event';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, MessageCircle, Lock } from 'lucide-react';
import { useActivityHistory } from '@/context/ActivityHistoryContext';
import { useToast } from '@/hooks/use-toast';
import { mockParticipants } from '@/data/mockData';

interface Props {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenDM?: (participantId: string, metAtEventTitle?: string) => void;
}


const PostEventReflectionDialog = ({ event, open, onOpenChange, onOpenDM }: Props) => {
  const { tagAttendee, hasTaggedMe } = useActivityHistory();
  const { toast } = useToast();
  const [picked, setPicked] = useState<string[]>([]);
  const [step, setStep] = useState<'pick' | 'chat'>('pick');
  const [tagged, setTagged] = useState<Participant[]>([]);

  useEffect(() => {
    if (open) {
      setPicked([]);
      setStep('pick');
      setTagged([]);
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

  const submit = () => {
    picked.forEach(id => tagAttendee({
      participantId: id,
      eventId: event.id,
      eventTitle: event.title,
      taggedAt: new Date(),
    }));
    const taggedPeople = options.filter(p => picked.includes(p.id));
    setTagged(taggedPeople);
    const mutuals = picked.filter(hasTaggedMe);
    toast({
      title: `Tagged ${picked.length} ${picked.length === 1 ? 'person' : 'people'}`,
      description: mutuals.length > 0
        ? `${mutuals.length} of them tagged you back — DMs unlocked.`
        : 'Stays private. If they tag you too, DMs unlock automatically.',
    });
    // Mutual tag → open the messaging window filtered to this event.
    if (mutuals.length > 0) {
      onOpenChange(false);
      onOpenDM?.(mutuals[0], event.title);
      return;
    }
    setStep('chat');
  };

  const startChat = (p: Participant) => {
    onOpenChange(false);
    onOpenDM?.(p.id, event.title);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {step === 'pick' ? (
          <>
            <DialogHeader>
              <DialogTitle>Who did you click with?</DialogTitle>
              <DialogDescription>
                Tag who you connected with from {event.title}. Tags are private — only mutual tags unlock messages.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-3 py-2 max-h-[320px] overflow-y-auto">
              {options.map(p => {

                const selected = picked.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p.id)}
                    className={`relative flex flex-col items-center gap-2 p-2 rounded-xl transition ${
                      selected ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-secondary'
                    }`}
                  >
                    <img src={p.avatar} alt={p.name} className="w-14 h-14 rounded-full object-cover" />
                    <span className="text-xs text-foreground line-clamp-1 w-full text-center">{p.name}</span>
                    {selected && (
                      <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 mt-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Skip</Button>
              <Button className="flex-1" disabled={picked.length === 0} onClick={submit}>
                Tag {picked.length || ''} {picked.length === 1 ? 'person' : picked.length ? 'people' : ''}
              </Button>
            </div>
          </>
        ) : (
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
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-2 rounded-xl border border-border"
                  >
                    <img src={p.avatar} alt={p.name} className="w-10 h-10 rounded-full object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {mutual ? 'Tagged you back — DMs unlocked' : 'Waiting for them to tag you'}
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
