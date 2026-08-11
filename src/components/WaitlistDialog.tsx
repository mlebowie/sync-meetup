import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Event } from '@/types/event';
import { Calendar, Apple, MessageCircle, Mail, Instagram, Link2, Check, Hourglass, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Props {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function parseEventDates(event: Event): { start: Date; end: Date } {
  const start = new Date(event.date);
  const m = event.time?.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (m) {
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const mer = m[3]?.toUpperCase();
    if (mer === 'PM' && h < 12) h += 12;
    if (mer === 'AM' && h === 12) h = 0;
    start.setHours(h, min, 0, 0);
  }
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return { start, end };
}

const toGCalDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

const buildIcs = (event: Event, start: Date, end: Date) => [
  'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sync//EN', 'BEGIN:VEVENT',
  `UID:${event.id}@sync`, `DTSTAMP:${toGCalDate(new Date())}`,
  `DTSTART:${toGCalDate(start)}`, `DTEND:${toGCalDate(end)}`,
  `SUMMARY:${event.title}`, `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
  `LOCATION:${event.location}`, 'END:VEVENT', 'END:VCALENDAR',
].join('\r\n');

const WAITLIST_KEY = 'sync.waitlist.v1';

const WaitlistDialog = ({ event, open, onOpenChange }: Props) => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!event) return null;
  const { start, end } = parseEventDates(event);
  const shareUrl = `${window.location.origin}/?event=${event.id}`;
  const shareText = `${event.title} on ${format(start, 'EEE, MMM d')} at ${event.time} — ${event.location}`;
  const gcalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${toGCalDate(start)}/${toGCalDate(end)}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.location)}`;

  const joinWaitlist = () => {
    if (!email || !/.+@.+\..+/.test(email)) {
      toast({ title: 'Enter a valid email', description: 'We need it to notify you when a spot opens.' });
      return;
    }
    try {
      const raw = localStorage.getItem(WAITLIST_KEY);
      const map = raw ? JSON.parse(raw) : {};
      map[event.id] = { email, ts: Date.now() };
      localStorage.setItem(WAITLIST_KEY, JSON.stringify(map));
    } catch { /* ignore */ }
    setJoined(true);
    toast({ title: "You're on the waitlist", description: `We'll email ${email} if a spot opens.` });
  };

  const downloadIcs = () => {
    const blob = new Blob([buildIcs(event, start, end)], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${event.title.replace(/\s+/g, '-')}.ics`; a.click();
    URL.revokeObjectURL(url);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setJoined(false); setEmail(''); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {joined ? <Check className="h-5 w-5 text-primary" /> : <Hourglass className="h-5 w-5 text-accent-strong" />}
            {joined ? "You're on the waitlist" : 'Join the waitlist'}
          </DialogTitle>
          <DialogDescription>
            {joined ? (
              <>We'll email <span className="font-medium text-foreground">{email}</span> the moment a spot opens up for <span className="font-medium text-foreground">{event.title}</span>.</>
            ) : (
              <><span className="font-medium text-foreground">{event.title}</span> is at full capacity. Drop your email and we'll notify you if a spot opens.</>
            )}
          </DialogDescription>
        </DialogHeader>

        {!joined ? (
          <div className="space-y-3">
            <Input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <Button className="w-full" onClick={joinWaitlist}>
              <Hourglass className="h-4 w-4 mr-2" /> Notify me by email
            </Button>
          </div>
        ) : null}

        <div className="space-y-4 pt-2">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Add to calendar (just in case)</p>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline" className="justify-start">
                <a href={gcalUrl} target="_blank" rel="noopener noreferrer"><Calendar className="h-4 w-4 mr-2" />Google</a>
              </Button>
              <Button variant="outline" className="justify-start" onClick={downloadIcs}>
                <Apple className="h-4 w-4 mr-2" />Apple / .ics
              </Button>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
              <Share2 className="h-3 w-3" /> Share with a friend
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline" className="justify-start">
                <a href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4 mr-2" />WhatsApp
                </a>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <a href={`mailto:?subject=${encodeURIComponent(event.title)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`}>
                  <Mail className="h-4 w-4 mr-2" />Email
                </a>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <a href={`https://www.instagram.com/direct/new/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`} target="_blank" rel="noopener noreferrer">
                  <Instagram className="h-4 w-4 mr-2" />Instagram
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

export default WaitlistDialog;
