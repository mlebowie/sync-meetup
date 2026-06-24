import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Lock } from 'lucide-react';
import { Organizer } from '@/types/event';
import { useToast } from '@/hooks/use-toast';

interface Props {
  organizer: Organizer;
  eventTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUICK_PROMPTS = [
  "Hi! Is there anything I should bring?",
  "Will there be a beginner-friendly intro?",
  "Running a few minutes late — is that okay?",
];

const OrganizerMessageDialog = ({ organizer, eventTitle, open, onOpenChange }: Props) => {
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  const handleSend = () => {
    if (!message.trim()) {
      toast({ title: 'Write a message first', variant: 'destructive' });
      return;
    }
    toast({
      title: `Message sent to ${organizer.name}`,
      description: 'They typically reply within a few hours.',
    });
    setMessage('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {organizer.avatar && (
              <img src={organizer.avatar} alt={organizer.name} className="w-10 h-10 rounded-full object-cover" />
            )}
            <div className="min-w-0">
              <DialogTitle>Message {organizer.name}</DialogTitle>
              <DialogDescription className="truncate text-xs">
                Re: {eventTitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-md px-2.5 py-1.5">
          <Lock className="h-3 w-3" />
          Private 1-on-1 conversation with the organizer
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Quick prompts</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setMessage(p)}
                className="text-xs px-2.5 py-1 rounded-full border border-border bg-background hover:bg-muted transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Write a private message to ${organizer.name}…`}
          rows={4}
          className="resize-none"
        />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSend}>
            <Send className="h-4 w-4 mr-1.5" />
            Send
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrganizerMessageDialog;
