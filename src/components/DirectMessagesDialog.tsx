import { useState, useRef, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSocial } from '@/context/SocialContext';
import { mockParticipants, mockEvents } from '@/data/mockData';
import { Send, MessageCircle, Users, Shield, UsersRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import EventGroupChatDialog from './EventGroupChatDialog';
import CrewChatDialog from './CrewChatDialog';
import { Group } from '@/types/event';
import ParticipantProfileDialog from './ParticipantProfileDialog';
import { formatDistanceToNowStrict } from 'date-fns';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPartnerId?: string | null;
  /** When opened from a post-event tag, filter People to co-attendees of this event. */
  metAtEventTitle?: string | null;

}

type Category = 'people' | 'organizers' | 'groups';

const lastTs = (msgs: { timestamp: Date }[]) =>
  msgs.length ? new Date(msgs[msgs.length - 1].timestamp).getTime() : 0;

const DirectMessagesDialog = ({ open, onOpenChange, initialPartnerId, metAtEventTitle }: Props) => {
  const { following, isMutual, dms, sendDM, organizerDms, sendOrganizerMessage, groupChats, crewChats, currentUser } = useSocial();
  const { history, tags } = useActivityHistory();
  const [metFilterOn, setMetFilterOn] = useState(true);

  useEffect(() => {
    if (open) setMetFilterOn(!!metAtEventTitle);
  }, [open, metAtEventTitle]);

  // Ids of people who attended the same event as the user (used by the "Met at ..." filter)
  const metIds = useMemo(() => {
    if (!metAtEventTitle) return null;
    const ids = new Set<string>();
    history.filter(h => h.title === metAtEventTitle).forEach(h => h.coAttendeeIds.forEach(id => ids.add(id)));
    tags.filter(t => t.eventTitle === metAtEventTitle).forEach(t => ids.add(t.participantId));
    return ids;
  }, [metAtEventTitle, history, tags]);

  // People sorted by most recent DM
  const mutualIds = useMemo(() => {
    const ids = new Set<string>(Array.from(following).filter(id => isMutual(id)));
    // Also surface anyone you already have a DM thread with (e.g. unlocked via mutual tags).
    Object.keys(dms).forEach(id => ids.add(id));
    // And the person the dialog was opened with, so a fresh chat shows up immediately.
    if (initialPartnerId) ids.add(initialPartnerId);
    let list = Array.from(ids);
    if (metFilterOn && metIds) list = list.filter(id => metIds.has(id) || id === initialPartnerId);
    return list.sort((a, b) => lastTs(dms[b]?.messages || []) - lastTs(dms[a]?.messages || []));
  }, [following, isMutual, dms, initialPartnerId, metFilterOn, metIds]);


  // Organizers sorted by most recent
  const organizerIds = useMemo(
    () => Object.keys(organizerDms).sort(
      (a, b) => lastTs(organizerDms[b].messages) - lastTs(organizerDms[a].messages)
    ),
    [organizerDms]
  );

  // Group chats sorted by most recent message
  const groupEntries = useMemo(() => {
    return Object.values(groupChats)
      .map(gc => {
        const event = mockEvents.find(e => e.id === gc.eventId);
        return event ? { event, lastTs: lastTs(gc.messages), count: gc.messages.length } : null;
      })
      .filter((x): x is { event: typeof mockEvents[number]; lastTs: number; count: number } => !!x)
      .sort((a, b) => b.lastTs - a.lastTs);
  }, [groupChats]);

  const crewEntries = useMemo(() => {
    return Object.values(crewChats)
      .map(cc => ({ crew: cc.crew, lastTs: lastTs(cc.messages), count: cc.messages.length }))
      .sort((a, b) => b.lastTs - a.lastTs);
  }, [crewChats]);

  const [category, setCategory] = useState<Category>('people');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [groupEvent, setGroupEvent] = useState<typeof mockEvents[number] | null>(null);
  const [activeCrew, setActiveCrew] = useState<Group | null>(null);
  const [draft, setDraft] = useState('');
  const [profileId, setProfileId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      if (initialPartnerId) {
        setCategory('people');
        setActiveId(initialPartnerId);
      } else {
        setActiveId(category === 'people' ? mutualIds[0] || null : category === 'organizers' ? organizerIds[0] || null : null);
      }
    }
  }, [open, initialPartnerId]); // eslint-disable-line

  useEffect(() => {
    if (category === 'groups') return;
    setActiveId(category === 'people' ? mutualIds[0] || null : organizerIds[0] || null);
    // eslint-disable-next-line
  }, [category]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [activeId, dms, organizerDms]);

  const isOrganizerView = category === 'organizers';
  const partner = !isOrganizerView ? mockParticipants.find(p => p.id === activeId) : null;
  const orgThread = isOrganizerView && activeId ? organizerDms[activeId] : null;

  const thread = isOrganizerView
    ? orgThread?.messages || []
    : activeId ? dms[activeId]?.messages || [] : [];

  const headerName = isOrganizerView ? orgThread?.organizer.name : partner?.name;
  const headerAvatar = isOrganizerView ? orgThread?.organizer.avatar : partner?.avatar;
  const headerSub = isOrganizerView
    ? orgThread ? `Organizer · ${orgThread.eventTitle}` : ''
    : partner?.neighborhood;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || !draft.trim()) return;
    if (isOrganizerView && orgThread) {
      sendOrganizerMessage(orgThread.organizer, orgThread.eventTitle, draft.trim());
    } else {
      sendDM(activeId, draft.trim());
    }
    setDraft('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 flex h-[560px]">
        <DialogHeader className="sr-only">
          <DialogTitle>Direct messages</DialogTitle>
          <DialogDescription>Chats with people and event organizers</DialogDescription>
        </DialogHeader>

        <aside className="w-60 border-r flex flex-col">
          <div className="p-3 border-b">
            <h3 className="font-display text-sm">Messages</h3>
          </div>
          <div className="grid grid-cols-3 gap-1 p-2 border-b">
            {([
              { id: 'people' as const, label: 'People', icon: Users, count: mutualIds.length },
              { id: 'groups' as const, label: 'Groups', icon: UsersRound, count: groupEntries.length + crewEntries.length },
              { id: 'organizers' as const, label: 'Hosts', icon: Shield, count: organizerIds.length },
            ]).map(tab => {
              const Icon = tab.icon;
              const active = category === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCategory(tab.id)}
                  className={cn(
                    'flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                    active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary/60'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-full',
                      active ? 'bg-primary-foreground/20' : 'bg-muted'
                    )}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>


          <div className="flex-1 overflow-y-auto">
            {category === 'people' && (
              mutualIds.length === 0 ? (
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
                  const last = dms[id]?.messages?.[dms[id].messages.length - 1];
                  return (
                    <button
                      key={id}
                      onClick={() => setActiveId(id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary/50 transition-colors ${activeId === id ? 'bg-secondary' : ''}`}
                    >
                      <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{p.name}</p>
                        {last && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            {formatDistanceToNowStrict(new Date(last.timestamp), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )
            )}

            {category === 'groups' && (
              groupEntries.length === 0 && crewEntries.length === 0 ? (
                <div className="p-4 text-center">
                  <UsersRound className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Tap "Attend" on any event or "Message crew" on a crew to start a group chat — it'll show up here.
                  </p>
                </div>
              ) : (
                <>
                  {crewEntries.map(({ crew, lastTs, count }) => (
                    <button
                      key={crew.id}
                      onClick={() => setActiveCrew(crew)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary/50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-md bg-accent/20 flex items-center justify-center shrink-0">
                        <UsersRound className="h-4 w-4 text-accent" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{crew.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          Crew · {count} message{count === 1 ? '' : 's'} ·{' '}
                          {lastTs ? formatDistanceToNowStrict(new Date(lastTs), { addSuffix: true }) : 'no messages yet'}
                        </p>
                      </div>
                    </button>
                  ))}
                  {groupEntries.map(({ event, lastTs, count }) => (
                    <button
                      key={event.id}
                      onClick={() => setGroupEvent(event)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary/50 transition-colors"
                    >
                      <img src={event.imageUrl} alt={event.title} className="w-8 h-8 rounded-md object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{event.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {count} message{count === 1 ? '' : 's'} ·{' '}
                          {lastTs ? formatDistanceToNowStrict(new Date(lastTs), { addSuffix: true }) : 'no messages yet'}
                        </p>
                      </div>
                    </button>
                  ))}
                </>
              )
            )}

            {category === 'organizers' && (
              organizerIds.length === 0 ? (
                <div className="p-4 text-center">
                  <Shield className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Message an event organizer from any event you're attending to start a private thread.
                  </p>
                </div>
              ) : (
                organizerIds.map(id => {
                  const t = organizerDms[id];
                  const last = t.messages[t.messages.length - 1];
                  return (
                    <button
                      key={id}
                      onClick={() => setActiveId(id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary/50 transition-colors ${activeId === id ? 'bg-secondary' : ''}`}
                    >
                      {t.organizer.avatar && (
                        <img src={t.organizer.avatar} alt={t.organizer.name} className="w-8 h-8 rounded-full object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{t.organizer.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {last ? formatDistanceToNowStrict(new Date(last.timestamp), { addSuffix: true }) : t.eventTitle}
                        </p>
                      </div>
                    </button>
                  );
                })
              )
            )}
          </div>
        </aside>

        <section className="flex-1 flex flex-col">
          {category === 'groups' ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-8 text-center">
              Pick a group chat on the left to jump back in.
            </div>
          ) : (partner || orgThread) ? (
            <>
              <div className="p-3 border-b flex items-center gap-2">
                {headerAvatar && (
                  partner ? (
                    <button onClick={() => setProfileId(partner.id)} className="shrink-0">
                      <img src={headerAvatar} alt={headerName} className="w-8 h-8 rounded-full object-cover ring-0 hover:ring-2 hover:ring-primary transition" />
                    </button>
                  ) : (
                    <img src={headerAvatar} alt={headerName} className="w-8 h-8 rounded-full object-cover" />
                  )
                )}
                <div className="min-w-0">
                  {partner ? (
                    <button
                      onClick={() => setProfileId(partner.id)}
                      className="text-sm font-semibold truncate hover:underline text-left"
                    >
                      {headerName}
                    </button>
                  ) : (
                    <p className="text-sm font-semibold truncate">{headerName}</p>
                  )}
                  <p className="text-xs text-muted-foreground truncate">{headerSub}</p>
                </div>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {thread.length === 0 && (
                  <p className="text-xs text-center text-muted-foreground mt-8">
                    Say hi to {(headerName || '').split(' ')[0]}!
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
                <Input
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder={`Message ${(headerName || '').split(' ')[0]}...`}
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!draft.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-8 text-center">
              {isOrganizerView
                ? 'Message an event organizer from any event you’re attending — your conversation will appear here.'
                : 'Tap on a participant avatar in any event card to view their profile and follow them.'}
            </div>
          )}
        </section>
      </DialogContent>
      <EventGroupChatDialog
        event={groupEvent}
        open={!!groupEvent}
        onOpenChange={(o) => { if (!o) setGroupEvent(null); }}
      />
      <CrewChatDialog
        crew={activeCrew}
        open={!!activeCrew}
        onOpenChange={(o) => { if (!o) setActiveCrew(null); }}
      />
      <ParticipantProfileDialog
        participant={profileId ? mockParticipants.find(p => p.id === profileId) || null : null}
        open={!!profileId}
        onOpenChange={(o) => { if (!o) setProfileId(null); }}
      />
    </Dialog>
  );
};

export default DirectMessagesDialog;
