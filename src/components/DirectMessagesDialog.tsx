import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSocial } from '@/context/SocialContext';
import { mockParticipants } from '@/data/mockData';
import { Send, MessageCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPartnerId?: string | null;
}

const DirectMessagesDialog = ({ open, onOpenChange, initialPartnerId }: Props) => {
  const { following, isMutual, dms, sendDM, currentUser } = useSocial();
  const mutualIds = Array.from(following).filter(id => isMutual(id));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setActiveId(initialPartnerId || mutualIds[0] || null);
    }
  }, [open, initialPartnerId]); // eslint-disable-line

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [activeId, dms]);

  const partner = mockParticipants.find(p => p.id === activeId);
  const thread = activeId ? dms[activeId]?.messages || [] : [];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || !draft.trim()) return;
    sendDM(activeId, draft.trim());
    setDraft('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 flex h-[560px]">
        <DialogHeader className="sr-only">
          <DialogTitle>Direct messages</DialogTitle>
          <DialogDescription>Chat with people who follow you back</DialogDescription>
        </DialogHeader>

        <aside className="w-56 border-r flex flex-col">
          <div className="p-3 border-b">
            <h3 className="font-display text-sm">Messages</h3>
            <p className="text-xs text-muted-foreground">Mutual follows only</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {mutualIds.length === 0 ? (
              <div className="p-4 text-center">
                <MessageCircle className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  Follow someone who follows you back to start chatting.
                </p>
              </div>
            ) : (
              mutualIds.map(id => {
                const p = mockParticipants.find(x => x.id === id);
                if (!p) return null;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveId(id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary/50 transition-colors ${activeId === id ? 'bg-secondary' : ''}`}
                  >
                    <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full object-cover" />
                    <span className="text-sm truncate">{p.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="flex-1 flex flex-col">
          {partner ? (
            <>
              <div className="p-3 border-b flex items-center gap-2">
                <img src={partner.avatar} alt={partner.name} className="w-8 h-8 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-semibold">{partner.name}</p>
                  <p className="text-xs text-muted-foreground">{partner.neighborhood}</p>
                </div>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {thread.length === 0 && (
                  <p className="text-xs text-center text-muted-foreground mt-8">
                    Say hi to {partner.name.split(' ')[0]}!
                  </p>
                )}
                {thread.map(m => {
                  const isMe = m.authorId === currentUser.id;
                  return (
                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                        {m.content}
                      </div>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={handleSend} className="p-3 border-t flex gap-2">
                <Input value={draft} onChange={e => setDraft(e.target.value)} placeholder={`Message ${partner.name.split(' ')[0]}...`} className="flex-1" />
                <Button type="submit" size="icon" disabled={!draft.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-8 text-center">
              Tap on a participant avatar in any event card to view their profile and follow them.
            </div>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
};

export default DirectMessagesDialog;
