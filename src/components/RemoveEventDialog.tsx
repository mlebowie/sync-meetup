import { useState } from 'react';
import { Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  event: { id: string; title: string; organizer_name: string | null; series_key: string | null };
  onRemoved: () => void;
}

type Kind = 'event' | 'series' | 'organiser' | 'title';

/**
 * Removes an event from SYNC: unlike Hide, the collector also skips it from then
 * on, together with the series, organiser or title words chosen here. Other
 * events in Waiting that the rule covers are hidden at the same time.
 */
export default function RemoveEventDialog({ event, onRemoved }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>('event');
  const [words, setWords] = useState(event.title);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const options: { kind: Kind; label: string; hint: string }[] = [
    { kind: 'event', label: 'Only this event', hint: 'The collector skips this listing.' },
    ...(event.series_key
      ? [{ kind: 'series' as Kind, label: 'Every date of this event', hint: 'For repeating events.' }]
      : []),
    ...(event.organizer_name
      ? [{ kind: 'organiser' as Kind, label: `Everything from ${event.organizer_name}`, hint: 'All their events, now and later.' }]
      : []),
    { kind: 'title', label: 'Any event with these words in the title', hint: 'For a type of event, e.g. "pub crawl".' },
  ];

  const remove = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc('remove_from_collection', {
      _event_id: event.id,
      _kind: kind,
      _words: kind === 'title' ? words.trim() : null,
      _reason: reason.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast({ title: 'Could not remove it', description: error.message });
      return;
    }
    const n = typeof data === 'number' ? data : 1;
    toast({
      title: 'Removed from SYNC',
      description: `${n} event${n === 1 ? '' : 's'} hidden. The collector won't bring ${kind === 'event' ? 'it' : 'these'} back.`,
    });
    setOpen(false);
    onRemoved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Ban className="h-4 w-4 mr-1" /> Remove
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Remove from SYNC</DialogTitle>
          <DialogDescription>
            Hides "{event.title}" and stops the collector from adding it again. You can undo this in the Hidden tab.
          </DialogDescription>
        </DialogHeader>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium mb-1">What should the collector skip?</legend>
          {options.map((o) => (
            <label key={o.kind} className="flex items-start gap-2 rounded-md border p-2 text-sm cursor-pointer">
              <input
                type="radio"
                name={`remove-${event.id}`}
                className="mt-1"
                checked={kind === o.kind}
                onChange={() => setKind(o.kind)}
              />
              <span>
                <span className="font-medium">{o.label}</span>
                <span className="block text-xs text-muted-foreground">{o.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {kind === 'title' && (
          <div className="space-y-1">
            <Label htmlFor={`remove-words-${event.id}`}>Words to match</Label>
            <Input id={`remove-words-${event.id}`} value={words} onChange={(e) => setWords(e.target.value)} />
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor={`remove-reason-${event.id}`}>Why (optional)</Label>
          <Input
            id={`remove-reason-${event.id}`}
            placeholder="e.g. multi-day course, not for newcomers"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={remove} disabled={busy || (kind === 'title' && words.trim().length < 3)}>
            {busy ? 'Removing…' : 'Remove'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
