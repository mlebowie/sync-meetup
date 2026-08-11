import { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Bell, UserPlus, Tag, Star, Ticket } from 'lucide-react';
import { useAttending } from '@/context/AttendingContext';
import { useToast } from '@/hooks/use-toast';
import { mockParticipants, mockEvents } from '@/data/mockData';
import PostEventReflectionDialog from './PostEventReflectionDialog';
import { Event } from '@/types/event';
import { formatDistanceToNow } from 'date-fns';

type NotifType = 'follow' | 'reflect' | 'rate' | 'waitlist';
interface Notif {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  when: Date;
  read: boolean;
  eventId?: string;
  participantId?: string;
}

const iconFor = (t: NotifType) => {
  const cls = 'h-4 w-4';
  switch (t) {
    case 'follow': return <UserPlus className={cls} />;
    case 'reflect': return <Tag className={cls} />;
    case 'rate': return <Star className={cls} />;
    case 'waitlist': return <Ticket className={cls} />;
  }
};

const tint: Record<NotifType, string> = {
  follow: 'bg-primary/10 text-primary',
  reflect: 'bg-accent/10 text-accent-strong',
  rate: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  waitlist: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const NotificationsPopover = ({ open, onOpenChange }: Props) => {
  const { attending, setAttending } = useAttending();
  const { toast } = useToast();
  const [reflectEvent, setReflectEvent] = useState<Event | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [waitlistStep, setWaitlistStep] = useState<0 | 1 | 2>(0);
  const [waitlistEvent, setWaitlistEvent] = useState<Event | null>(null);

  const notifications = useMemo<Notif[]>(() => {
    const now = Date.now();
    const list: Notif[] = [];

    // 1. New followers
    const newFollowers = [mockParticipants[1], mockParticipants[4]];
    newFollowers.forEach((p, i) => list.push({
      id: `follow-${p.id}`,
      type: 'follow',
      title: `${p.name} started following you`,
      body: 'Tap to view their profile',
      when: new Date(now - (30 + i * 45) * 60 * 1000),
      read: false,
      participantId: p.id,
    }));

    // 2. Post-event reflect (tag) + 3. Rate — use most recent past attending / mock event
    const attendedPast = mockEvents.find(e => attending.has(e.id) && new Date(e.date).getTime() < now);
    const pastEvent = attendedPast ?? mockEvents[6];
    if (pastEvent) {
      list.push({
        id: `reflect-${pastEvent.id}`,
        type: 'reflect',
        title: `Who did you click with at ${pastEvent.title}?`,
        body: 'Tag 1–3 people to follow up with',
        when: new Date(now - 2 * 60 * 60 * 1000),
        read: false,
        eventId: pastEvent.id,
      });
      list.push({
        id: `rate-${pastEvent.id}`,
        type: 'rate',
        title: `Rate ${pastEvent.title}`,
        body: 'How was the vibe? Your review helps the crew.',
        when: new Date(now - 3 * 60 * 60 * 1000),
        read: false,
        eventId: pastEvent.id,
      });
    }

    // 4. Waitlist spot opened
    const upcoming = mockEvents[2];
    if (upcoming) list.push({
      id: `waitlist-${upcoming.id}`,
      type: 'waitlist',
      title: `A spot opened for ${upcoming.title}`,
      body: 'You have 30 min to claim it before the next person on the list.',
      when: new Date(now - 8 * 60 * 1000),
      read: false,
      eventId: upcoming.id,
    });

    return list.filter(n => !dismissed.has(n.id))
      .sort((a, b) => b.when.getTime() - a.when.getTime());
  }, [attending, dismissed]);

  const unread = notifications.length;

  const handleClick = (n: Notif) => {
    if (n.type === 'reflect') {
      const ev = mockEvents.find(e => e.id === n.eventId);
      if (ev) setReflectEvent(ev);
      setDismissed(prev => new Set(prev).add(n.id));
      return;
    }
    if (n.type === 'waitlist') {
      const ev = mockEvents.find(e => e.id === n.eventId);
      if (ev) {
        setWaitlistEvent(ev);
        setWaitlistStep(1);
        onOpenChange(false);
      }
      return;
    }
    setDismissed(prev => new Set(prev).add(n.id));
  };

  const confirmWaitlist = () => {
    if (!waitlistEvent) return;
    setAttending(waitlistEvent.id, true);
    setDismissed(prev => new Set(prev).add(`waitlist-${waitlistEvent.id}`));
    toast({
      title: "You're in. See you there.",
      description: `Locked in for "${waitlistEvent.title}".`,
    });
    setWaitlistStep(0);
    setWaitlistEvent(null);
  };


  return (
    <>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-accent text-[10px] font-bold flex items-center justify-center text-accent-foreground">
                {unread}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[360px] p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {notifications.length > 0 && (
              <button
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setDismissed(prev => {
                  const n = new Set(prev);
                  notifications.forEach(x => n.add(x.id));
                  return n;
                })}
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                You're all caught up 🎉
              </div>
            ) : notifications.map(n => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className="w-full text-left flex gap-3 px-4 py-3 hover:bg-secondary/60 border-b border-border/50 last:border-0 transition"
              >
                <span className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${tint[n.type]}`}>
                  {iconFor(n.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground line-clamp-2">{n.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(n.when, { addSuffix: true })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <PostEventReflectionDialog
        event={reflectEvent}
        open={!!reflectEvent}
        onOpenChange={(o) => !o && setReflectEvent(null)}
      />

      {/* Step 1: intent check */}
      <AlertDialog open={waitlistStep === 1} onOpenChange={(o) => !o && setWaitlistStep(0)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Claim your spot?</AlertDialogTitle>
            <AlertDialogDescription>
              A spot just opened for <span className="font-medium text-foreground">{waitlistEvent?.title}</span>. Do you want to register?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction onClick={() => setWaitlistStep(2)}>Yes, continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Step 2: final confirmation */}
      <AlertDialog open={waitlistStep === 2} onOpenChange={(o) => !o && setWaitlistStep(0)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm registration</AlertDialogTitle>
            <AlertDialogDescription>
              You're committing to show up for <span className="font-medium text-foreground">{waitlistEvent?.title}</span>. The group is counting on you — cancellations affect your reliability score.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setWaitlistStep(1)}>Back</AlertDialogCancel>
            <AlertDialogAction onClick={confirmWaitlist}>Confirm & register</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default NotificationsPopover;
