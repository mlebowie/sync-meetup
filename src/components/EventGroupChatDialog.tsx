import { useState, useEffect, useRef, useMemo } from 'react';
import { Event, Participant } from '@/types/event';
import { seedGroupChat, getIcebreaker } from '@/lib/groupChatSeed';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSocial } from '@/context/SocialContext';
import { Send, Sparkles, Image as ImageIcon, Clock, AlarmClock } from 'lucide-react';
import { format, differenceInHours, formatDistanceToNowStrict } from 'date-fns';
import { mockParticipants } from '@/data/mockData';
import ParticipantProfileDialog from './ParticipantProfileDialog';

const CHAT_LIFETIME_HOURS = 48;
const notifiedExpiry = new Set<string>();

interface Props {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}


const memes = [
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?w=400&h=300&fit=crop',
];

const EventGroupChatDialog = ({ event, open, onOpenChange }: Props) => {
  const { groupChats, sendGroupMessage, ensureGroupChat, currentUser } = useSocial();
  const [draft, setDraft] = useState('');
  const [profileParticipant, setProfileParticipant] = useState<Participant | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => new Date());

  const icebreaker = event ? getIcebreaker(event) : '';

  const expiresAt = useMemo(
    () => (event ? new Date(event.date.getTime() + CHAT_LIFETIME_HOURS * 60 * 60 * 1000) : null),
    [event]
  );
  const hoursRemaining = expiresAt ? differenceInHours(expiresAt, now) : 0;
  const eventEnded = event ? now.getTime() >= event.date.getTime() : false;
  const isExpired = expiresAt ? now.getTime() >= expiresAt.getTime() : false;
  const inFinal24h = eventEnded && !isExpired && hoursRemaining <= 24;

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [open]);

  // Fire one-time "expires in 24h" notification when entering the final-day window
  useEffect(() => {
    if (!event || !inFinal24h) return;
    if (notifiedExpiry.has(event.id)) return;
    notifiedExpiry.add(event.id);
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Chat expires in 24 hours', {
          body: `${event.title} — swap socials or start a Crew before it disappears.`,
        });
      } catch { /* ignore */ }
    }
  }, [event, inFinal24h]);

  useEffect(() => {
    if (!event || !open) return;
    ensureGroupChat(event.id, seedGroupChat(event));
  }, [event, open, ensureGroupChat]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [event, groupChats]);

  if (!event) return null;
  const messages = groupChats[event.id]?.messages || [];

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!draft.trim()) return;
    sendGroupMessage(event.id, draft.trim(), 'text');
    setDraft('');
  };

  const sendMeme = () => {
    const url = memes[Math.floor(Math.random() * memes.length)];
    sendGroupMessage(event.id, url, 'meme');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 flex flex-col h-[600px]">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-base font-display">{event.title}</DialogTitle>
          <DialogDescription className="text-xs">
            Group chat · {event.currentParticipants} attendees · {format(event.date, 'MMM d')}
          </DialogDescription>
        </DialogHeader>

        {eventEnded && !isExpired && !inFinal24h && (
          <div className="px-4 py-2 border-b flex items-center gap-2 text-xs text-muted-foreground bg-muted/40">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>Group chat expires in {formatDistanceToNowStrict(expiresAt!)}</span>
          </div>
        )}
        {inFinal24h && (
          <div className="px-4 py-2.5 border-b flex items-start gap-2 text-sm bg-accent/10 text-accent-foreground border-accent/30">
            <AlarmClock className="h-4 w-4 mt-0.5 shrink-0 text-accent-strong" />
            <p>
              <span className="font-semibold">Chat expires in 24 hours</span> — swap socials or start a Crew before it disappears.
            </p>
          </div>
        )}

        <div className="px-4 py-3 bg-primary/5 border-b flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-foreground">
            <span className="font-semibold">Icebreaker:</span> {icebreaker}
          </p>
        </div>

        {isExpired ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-2">
            <Clock className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">This chat has ended</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Tagged connections moved to your Crews. Find them on your profile to keep the conversation going.
            </p>
          </div>
        ) : (
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(m => {
              const isMe = m.authorId === currentUser.id;
              const isBot = m.authorId === 'sync-bot';
              if (isBot) {
                return (
                  <div key={m.id} className="text-center">
                    <span className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                      {m.content}
                    </span>
                  </div>
                );
              }
              const openProfile = () => {
                const p = mockParticipants.find(x => x.id === m.authorId)
                  ?? event.participants?.find(x => x.id === m.authorId)
                  ?? null;
                if (p) setProfileParticipant(p);
              };
              return (
                <div key={m.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                  {!isMe && (
                    <button type="button" onClick={openProfile} className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-primary">
                      <img src={m.authorAvatar} alt={m.authorName} className="w-7 h-7 rounded-full object-cover" />
                    </button>
                  )}
                  <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!isMe && (
                      <button
                        type="button"
                        onClick={openProfile}
                        className="text-xs text-muted-foreground mb-0.5 hover:text-primary hover:underline"
                      >
                        {m.authorName}
                      </button>
                    )}
                    {m.type === 'meme' ? (
                      <img src={m.content} alt="meme" className="rounded-xl max-w-full" />
                    ) : (
                      <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                        {m.content}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <form onSubmit={handleSend} className="p-3 border-t flex gap-2">
          <Button type="button" variant="outline" size="icon" onClick={sendMeme} title="Send a meme" disabled={isExpired}>
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder={isExpired ? 'Chat has ended' : 'Respond to the icebreaker...'}
            className="flex-1"
            disabled={isExpired}
          />
          <Button type="submit" size="icon" disabled={!draft.trim() || isExpired}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </DialogContent>
      <ParticipantProfileDialog
        participant={profileParticipant}
        open={!!profileParticipant}
        onOpenChange={(o) => { if (!o) setProfileParticipant(null); }}
      />
    </Dialog>
  );
};

export default EventGroupChatDialog;
