import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Event } from '@/types/event';
import { Calendar, Apple, Share2, Mail, MessageCircle, Instagram, Link2, Check } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Props {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

const AttendConfirmationDialog = ({ event, open, onOpenChange }: Props) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  if (!event) return null;

  const { start, end } = parseEventDates(event);
  const shareUrl = `${window.location.origin}/?event=${event.id}`;
  const shareText = `Join me at ${event.title} on ${format(start, 'EEE, MMM d')} at ${event.time} — ${event.location}`;

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

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
    setCopied(true);
    toast({ title: 'Link copied', description: 'Share it anywhere.' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-primary" />
            You're in!
          </DialogTitle>
          <DialogDescription>
            Add <span className="font-medium text-foreground">{event.title}</span> to your calendar or invite a friend.
            <span className="block mt-1 text-xs">
              We'll open the event group chat in a few seconds — it disappears 48 hours after the event takes place.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Add to calendar</p>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline" className="justify-start">
                <a href={gcalUrl} target="_blank" rel="noopener noreferrer">
                  <Calendar className="h-4 w-4 mr-2" />
                  Google
                </a>
              </Button>
              <Button variant="outline" className="justify-start" onClick={downloadIcs}>
                <Apple className="h-4 w-4 mr-2" />
                Apple / .ics
              </Button>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
              <Share2 className="h-3 w-3" /> Share
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline" className="justify-start">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </a>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <a
                  href={`mailto:?subject=${encodeURIComponent(event.title)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </a>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <a
                  href={`https://www.instagram.com/direct/new/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Instagram className="h-4 w-4 mr-2" />
                  Instagram
                </a>
              </Button>
              <Button variant="outline" className="justify-start" onClick={copyLink}>
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
                {copied ? 'Copied' : 'Copy link'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AttendConfirmationDialog;
