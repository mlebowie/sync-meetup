import { useState, useEffect } from 'react';
import { Event } from '@/types/event';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { useActivityHistory } from '@/context/ActivityHistoryContext';
import { useToast } from '@/hooks/use-toast';

interface Props {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PostEventReflectionDialog = ({ event, open, onOpenChange }: Props) => {
  const { tagAttendee, hasTaggedMe } = useActivityHistory();
  const { toast } = useToast();
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => { if (open) setPicked([]); }, [open, event?.id]);

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
    const mutualCount = picked.filter(hasTaggedMe).length;
    toast({
      title: `Tagged ${picked.length} ${picked.length === 1 ? 'person' : 'people'}`,
      description: mutualCount > 0
        ? `${mutualCount} of them tagged you back — DMs unlocked.`
        : 'Stays private. If they tag you too, DMs unlock automatically.',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Who did you click with?</DialogTitle>
          <DialogDescription>
            Pick 1–3 people from {event.title}. Tags are private — only mutual tags unlock messages.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-2">
          {event.participants.map(p => {
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
      </DialogContent>
    </Dialog>
  );
};

export default PostEventReflectionDialog;
