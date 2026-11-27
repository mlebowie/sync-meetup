import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Event } from '@/types/event';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import InviteFriendsPicker from './InviteFriendsPicker';
import { useInviteCandidates } from '@/hooks/useInviteCandidates';
import { primaryCta, secondaryLink } from '@/lib/ctaStyles';
import { startTime24 } from '@/lib/startTime';

interface Props {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the person starts picking friends to invite, so the card can hold off the auto-opening chat. */
  onEngage?: () => void;
}

function parseEventDates(event: Event): { start: Date; end: Date } {
  const start = new Date(event.date);
  // best-effort parse "HH:MM" or "H:MM AM/PM" — fall back to event.date as-is
  const m = event.time?.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (m) {
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const mer = m[3]?.toUpperCase();
    if (mer === 'PM' && h < 12) h += 12;
    if (mer === 'AM' && h === 12) h = 0;
    start.setHours(h, min, 0, 0);
  }
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // +2h default
  return { start, end };
}

function toGCalDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function buildIcs(event: Event, start: Date, end: Date) {
  const fmt = (d: Date) => toGCalDate(d);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sync//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@sync`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
    `LOCATION:${event.location}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

const AttendConfirmationDialog = ({ event, open, onOpenChange, onEngage }: Props) => {
  const { toast } = useToast();
  const candidates = useInviteCandidates(event);
  const [calendarOpen, setCalendarOpen] = useState(false);
  if (!event) return null;

  const { start, end } = parseEventDates(event);
  const shareUrl = `${window.location.origin}/?event=${event.id}`;
  const shareText = `Join me at ${event.title} on ${format(start, 'EEE d MMM')} at ${startTime24(event.time)}, ${event.location}.`;

  const gcalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${toGCalDate(start)}/${toGCalDate(end)}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.location)}`;

  const downloadIcs = () => {
    const blob = new Blob([buildIcs(event, start, end)], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/\s+/g, '-')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Invite someone who isn't on SYNC yet: the phone's share sheet (WhatsApp, Instagram, email...),
  // or the link copied where there is no share sheet.
  const inviteNewFriend = async () => {
    onEngage?.();
    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, text: shareText, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      toast({ title: 'Link copied', description: 'Paste it to a friend.' });
    } catch {
      // Share sheet dismissed.
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { onOpenChange(o); if (!o) setCalendarOpen(false); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-2xl font-light tracking-[0.015em]">You're in.</DialogTitle>
          <DialogDescription>Bring a friend to {event.title}.</DialogDescription>
        </DialogHeader>

        {/* Friends on SYNC first (only when you have connections to invite), then anyone else by link. */}
        {candidates.length > 0 && (
          <InviteFriendsPicker event={event} onEngage={onEngage} listClassName="max-h-56" quietSend />
        )}

        <div className="flex flex-col">
          <Button className={primaryCta} onClick={inviteNewFriend}>
            Invite a new friend
          </Button>
          <button type="button" className={secondaryLink} onClick={() => setCalendarOpen(v => !v)} aria-expanded={calendarOpen}>
            Add to calendar
          </button>
          {calendarOpen && (
            <div className="flex justify-center gap-6 text-sm font-medium text-[#974B35]">
              <a href={gcalUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[#7A3C2A]">Google</a>
              <button type="button" onClick={downloadIcs} className="hover:text-[#7A3C2A]">Apple</button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          The group chat opens in a few seconds and disappears <span className="font-semibold text-foreground">48 hours</span> after the event.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default AttendConfirmationDialog;
