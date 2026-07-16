import { useState, useEffect, useRef } from 'react';
import { Group, Participant } from '@/types/event';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSocial } from '@/context/SocialContext';
import { Send, Users2 } from 'lucide-react';
import { mockParticipants } from '@/data/mockData';
import ParticipantProfileDialog from './ParticipantProfileDialog';

interface Props {
  crew: Group | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CrewChatDialog = ({ crew, open, onOpenChange }: Props) => {
  const { crewChats, ensureCrewChat, sendCrewMessage, currentUser } = useSocial();
  const [draft, setDraft] = useState('');
  const [profile, setProfile] = useState<Participant | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (crew && open) ensureCrewChat(crew);
  }, [crew, open, ensureCrewChat]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [crew, crewChats]);

  if (!crew) return null;
  const messages = crewChats[crew.id]?.messages || [];
  const members = crew.memberIds
    .map(id => mockParticipants.find(p => p.id === id))
    .filter((p): p is Participant => !!p);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    sendCrewMessage(crew.id, draft.trim());
    setDraft('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 flex flex-col h-[600px]">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-base font-display flex items-center gap-2">
            <Users2 className="h-4 w-4 text-accent" />
            {crew.name}
          </DialogTitle>
          <DialogDescription className="text-xs">{crew.reason}</DialogDescription>
        </DialogHeader>

        <div className="px-4 py-2 border-b flex items-center gap-2 overflow-x-auto">
          {members.map(m => (
            <button
              key={m.id}
              onClick={() => setProfile(m)}
              className="flex flex-col items-center gap-1 shrink-0"
              title={m.name}
            >
              <img src={m.avatar} alt={m.name} className="w-9 h-9 rounded-full object-cover hover:ring-2 hover:ring-primary transition" />
              <span className="text-[10px] text-muted-foreground max-w-[60px] truncate">{m.name.split(' ')[0]}</span>
            </button>
          ))}
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
            const openProfile = () => {
              const p = mockParticipants.find(x => x.id === m.authorId);
              if (p) setProfile(p);
            };
            return (
              <div key={m.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                {!isMe && (
                  <button type="button" onClick={openProfile} className="shrink-0 rounded-full">
                    <img src={m.authorAvatar} alt={m.authorName} className="w-7 h-7 rounded-full object-cover" />
                  </button>
                )}
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!isMe && (
                    <button type="button" onClick={openProfile} className="text-xs text-muted-foreground mb-0.5 hover:text-primary hover:underline">
                      {m.authorName}
                    </button>
                  )}
                  <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSend} className="p-3 border-t flex gap-2">
          <Input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder={`Message ${crew.name}...`}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!draft.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </DialogContent>
      <ParticipantProfileDialog
        participant={profile}
        open={!!profile}
        onOpenChange={(o) => { if (!o) setProfile(null); }}
      />
    </Dialog>
  );
};

export default CrewChatDialog;
