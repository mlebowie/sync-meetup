import { useState, useEffect, useRef, useMemo } from 'react';
import { Event, ChatMessage } from '@/types/event';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSocial } from '@/context/SocialContext';
import { Send, Sparkles, Image as ImageIcon, Clock, AlarmClock } from 'lucide-react';
import { format, differenceInHours, formatDistanceToNowStrict } from 'date-fns';

const CHAT_LIFETIME_HOURS = 7 * 24;
const notifiedExpiry = new Set<string>();

interface Props {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const icebreakersByCategory: Record<string, string> = {
  Sports: 'What’s the last sport that left you sore but smiling?',
  Wellness: 'Share one tiny ritual that resets your day.',
  Networking: 'What are you building or curious about right now?',
  Social: 'What’s your go-to “new in town” conversation starter?',
  Dance: 'What song instantly gets you moving?',
  Arts: 'Drop a photo, lyric or quote that defines your week.',
  'Food & Drinks': 'What’s the best bite you’ve had in Porto so far?',
  Outdoors: 'Sunrise or sunset — and where’s your favourite spot for it?',
};

const memes = [
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?w=400&h=300&fit=crop',
];

const EventGroupChatDialog = ({ event, open, onOpenChange }: Props) => {
  const { groupChats, sendGroupMessage, ensureGroupChat, currentUser } = useSocial();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const icebreaker = event ? icebreakersByCategory[event.category] || 'Introduce yourself in one sentence!' : '';

  useEffect(() => {
    if (!event || !open) return;
    const seed: ChatMessage[] = [
      {
        id: `seed-${event.id}`,
        authorId: 'sync-bot',
        authorName: 'Sync',
        authorAvatar: '',
        content: `🧊 Icebreaker for "${event.title}": ${icebreaker}`,
        type: 'text',
        timestamp: new Date(event.date.getTime() - 24 * 60 * 60 * 1000),
      },
      ...event.participants.slice(0, 2).map((p, i) => ({
        id: `seed-${event.id}-${p.id}`,
        authorId: p.id,
        authorName: p.name,
        authorAvatar: p.avatar,
        content: i === 0 ? 'Hey everyone 👋 super excited for this!' : 'Same! First time joining — see you there.',
        type: 'text' as const,
        timestamp: new Date(event.date.getTime() - 23 * 60 * 60 * 1000 + i * 60000),
      })),
    ];
    ensureGroupChat(event.id, seed);
  }, [event, open, icebreaker, ensureGroupChat]);

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

        <div className="px-4 py-3 bg-primary/5 border-b flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-foreground">
            <span className="font-semibold">Icebreaker:</span> {icebreaker}
          </p>
        </div>

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
            return (
              <div key={m.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                {!isMe && (
                  <img src={m.authorAvatar} alt={m.authorName} className="w-7 h-7 rounded-full object-cover shrink-0" />
                )}
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!isMe && <span className="text-xs text-muted-foreground mb-0.5">{m.authorName}</span>}
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

        <form onSubmit={handleSend} className="p-3 border-t flex gap-2">
          <Button type="button" variant="outline" size="icon" onClick={sendMeme} title="Send a meme">
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Respond to the icebreaker..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!draft.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EventGroupChatDialog;
