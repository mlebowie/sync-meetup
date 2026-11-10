import { useState } from 'react';
import { format } from 'date-fns';
import { Check, Link2 } from 'lucide-react';
import { Event } from '@/types/event';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { shareStrings } from '@/lib/eventCalendar';
import InviteFriendsPicker from './InviteFriendsPicker';

interface Props {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** "Invite friends" for an event you're going to: a bottom sheet on phones, a dialog on desktop. */
const InviteFriendsDialog = ({ event, open, onOpenChange }: Props) => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  if (!event) return null;

  const subtitle = `${event.title} · ${format(event.date, 'EEE d MMM')}${event.time ? ` · ${event.time}` : ''}`;

  const copyLink = async () => {
    const share = shareStrings(event);
    try {
      await navigator.clipboard.writeText(`${share.text} ${share.url}`);
      setCopied(true);
      toast({ title: 'Link copied', description: "Send it to a friend who isn't on SYNC yet." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Couldn't copy the link", variant: 'destructive' });
    }
  };

  const body = (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">People you've met at SYNC events. They'll get an invite from you.</p>
      <InviteFriendsPicker event={event} onSent={() => onOpenChange(false)} listClassName="max-h-[45vh]" />
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline min-h-[44px]"
      >
        {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
        Friend not on SYNC? Copy event link
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Invite friends</DrawerTitle>
            <DrawerDescription>{subtitle}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6">{body}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite friends</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
};

export default InviteFriendsDialog;
