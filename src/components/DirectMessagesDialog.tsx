import { useState, useRef, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSocial } from '@/context/SocialContext';
import { useActivityHistory } from '@/context/ActivityHistoryContext';

import { mockParticipants } from '@/data/mockData';
import { useEvents } from '@/context/EventsContext';
import { Send, MessageCircle, UsersRound, Check, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import EventGroupChatDialog from './EventGroupChatDialog';
import CrewChatDialog from './CrewChatDialog';
import { Group } from '@/types/event';
import ParticipantProfileDialog from './ParticipantProfileDialog';
import SocialLinkIcons from './SocialLinkIcons';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { conversationPrompts, daysLeftLabel, planEvents, planInvite, reachOutDaysLeft } from '@/lib/connectionPrompts';
import { revealDelay, revealItem } from '@/lib/ctaStyles';
import { getUserProfile } from '@/lib/userProfile';
import { TaggedConnection } from '@/types/event';
import ConnectionNoteField from './ConnectionNoteField';
import { lastMetAt } from '@/lib/connectionNotes';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPartnerId?: string | null;
  /** When opened from a post-event tag, filter People to co-attendees of this event. */
  metAtEventTitle?: string | null;

}

type Category = 'people' | 'groups';

const lastTs = (msgs: { timestamp: Date }[]) =>
  msgs.length ? new Date(msgs[msgs.length - 1].timestamp).getTime() : 0;

/** The most recent event where you tagged this person (where you met). */
const latestTagFor = (tags: TaggedConnection[], id: string | null) =>
  id
    ? tags
        .filter(t => t.participantId === id)
        .sort((a, b) => new Date(b.taggedAt).getTime() - new Date(a.taggedAt).getTime())[0] ?? null
    : null;

const DirectMessagesDialog = ({ open, onOpenChange, initialPartnerId, metAtEventTitle }: Props) => {
  const { events: mockEvents } = useEvents();
  const { dms, sendDM, groupChats, crewChats, currentUser } = useSocial();
  const { history, tags, connectionIds } = useActivityHistory();
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
    // Friends = connections (you tagged each other after the same event).
    const ids = new Set<string>(connectionIds);
    // Also surface anyone you already have a DM thread with (e.g. unlocked via mutual tags).
    Object.keys(dms).forEach(id => ids.add(id));
    // And the person the dialog was opened with, so a fresh chat shows up immediately.
    if (initialPartnerId) ids.add(initialPartnerId);
    let list = Array.from(ids);
    if (metFilterOn && metIds) list = list.filter(id => metIds.has(id) || id === initialPartnerId);
    return list.sort((a, b) => lastTs(dms[b]?.messages || []) - lastTs(dms[a]?.messages || []));
  }, [connectionIds, dms, initialPartnerId, metFilterOn, metIds]);



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
  // Tablets and phones show one column at a time: the list, or (after tapping someone) the conversation.
  const [mobileThread, setMobileThread] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setMobileThread(!!initialPartnerId);
      // The toggle always opens on Friends.
      setCategory('people');
      setActiveId(initialPartnerId || mutualIds[0] || null);
    }
  }, [open, initialPartnerId]); // eslint-disable-line

  useEffect(() => {
    if (category === 'groups') {
      setMobileThread(false);
      return;
    }
    setActiveId(mutualIds[0] || null);
    // eslint-disable-next-line
  }, [category]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [activeId, dms]);

  const partner = mockParticipants.find(p => p.id === activeId) || null;

  const thread = activeId ? dms[activeId]?.messages || [] : [];

  const headerName = partner?.name;
  const firstName = (headerName || '').split(' ')[0];
  const headerAvatar = partner?.avatar;

  // Where you met, and what to talk about: ideas follow that event's interest category, and the
  // plan suggests the next event in the same category when there is one.
  const metTag = latestTagFor(tags, activeId);
  const metCategory = metTag?.eventCategory ?? mockEvents.find(e => e.id === metTag?.eventId)?.category;
  const metEvent = mockEvents.find(e => e.id === metTag?.eventId);
  // Another of the same (the next date of the series, or the same activity: another run after a
  // run club), then another event in the same category.
  const suggestions = useMemo(
    () =>
      metTag
        ? planEvents(mockEvents, {
            eventId: metTag.eventId,
            title: metTag.eventTitle,
            category: metCategory,
            seriesId: metEvent?.seriesId,
          })
        : [],
    [mockEvents, metTag, metCategory, metEvent?.seriesId],
  );
  const reachedOut = (id: string | null) => !!id && (dms[id]?.messages ?? []).some(m => m.authorId === currentUser.id);
  const showStarters = !!partner && !!metTag && !reachedOut(activeId);
  const prompts = showStarters
    ? conversationPrompts({ firstName, eventTitle: metTag.eventTitle, category: metCategory })
    : null;
  // What you share: the event (with its date when we know it), your neighbourhood, your private note.
  const me = getUserProfile();
  const hood = (v?: string) => (v ?? '').split(',')[0].trim().toLowerCase();
  const sameHood = !!me?.neighborhood && hood(me.neighborhood) === hood(partner?.neighborhood);
  const initials = (name?: string) => (name ?? '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const daysLeft = metTag ? daysLeftLabel(reachOutDaysLeft(metTag.taggedAt)) : null;
  const lastMet = activeId ? lastMetAt(activeId, tags, history) : null;
  const headerSub = lastMet ? `Last met at ${lastMet.title}` : partner?.neighborhood;

  const fillDraft = (text: string) => {
    setDraft(text);
    inputRef.current?.focus();
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || !draft.trim()) return;
    sendDM(activeId, draft.trim());
    setDraft('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Phones and tablets: a near full-screen single column. Desktop (lg+): list and conversation side by side. */}
      <DialogContent
        className="w-[calc(100vw-1.5rem)] max-w-2xl lg:w-full p-0 gap-0 flex h-[min(560px,calc(100dvh-6rem))] lg:h-[560px] overflow-hidden rounded-2xl"
        // Don't auto-focus the first control on open: it drew a focus ring round "Friends" on phones.
        onOpenAutoFocus={e => e.preventDefault()}
        // Close X on the same middle line as the conversation bar (name, location and social icons).
        closeClassName="top-[1.625rem]"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Direct messages</DialogTitle>
          <DialogDescription>Chats with people and event groups</DialogDescription>
        </DialogHeader>

        <aside className={cn('w-full lg:w-60 lg:border-r flex-col min-w-0', mobileThread ? 'hidden lg:flex' : 'flex')}>
          <div className="hidden lg:block p-3 border-b">
            <h3 className="font-display text-sm">Messages</h3>
          </div>
          {/* Friends / Groups toggle: a sliding switch that starts on Friends. Right padding on smaller
              screens keeps it clear of the close X. */}
          <div className="p-2 pr-12 lg:pr-2 border-b">
            <div
              role="tablist"
              aria-label="Show chats with"
              className="relative grid grid-cols-2 rounded-full bg-muted p-1"
            >
              <span
                aria-hidden
                className={cn(
                  'absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-primary shadow-sm transition-transform duration-300 ease-out',
                  category === 'groups' && 'translate-x-full'
                )}
              />
              {([
                { id: 'people' as const, label: 'Friends', hint: 'People you both tagged after an event' },
                { id: 'groups' as const, label: 'Groups', hint: 'Everyone going to the events you are attending' },
              ]).map(tab => {
                const active = category === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    title={tab.hint}
                    onClick={() => setCategory(tab.id)}
                    className={cn(
                      'relative z-10 rounded-full py-1.5 text-sm font-medium transition-colors duration-300',
                      active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {category === 'people' && metAtEventTitle && (
              <div className="p-2 border-b">
                <button
                  type="button"
                  onClick={() => setMetFilterOn(v => !v)}
                  className={cn(
                    'w-full flex items-center gap-1.5 px-2 py-1.5 rounded-full text-[11px] font-medium border transition-colors',
                    metFilterOn
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:bg-secondary/60'
                  )}
                >
                  {metFilterOn && <Check className="h-3 w-3 shrink-0" />}
                  <span className="truncate">Met at {metAtEventTitle}</span>
                </button>
              </div>
            )}

            {category === 'people' && (

              mutualIds.length === 0 ? (
                <div className="p-4 text-center">
                  <MessageCircle className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Attend your first event and mutual connections will unlock your first conversation.
                  </p>
                </div>
              ) : (
                mutualIds.map(id => {
                  const p = mockParticipants.find(x => x.id === id);
                  if (!p) return null;
                  const last = dms[id]?.messages?.[dms[id].messages.length - 1];
                  // New connection you haven't written to yet: nudge to make a plan within the week.
                  const rowTag = reachedOut(id) ? null : latestTagFor(tags, id);
                  const rowDaysLeft = rowTag ? daysLeftLabel(reachOutDaysLeft(rowTag.taggedAt)) : null;
                  return (
                    <button
                      key={id}
                      onClick={() => { setActiveId(id); setMobileThread(true); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary/50 transition-colors ${activeId === id ? 'bg-secondary' : ''}`}
                    >
                      <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{p.name}</p>
                        {rowDaysLeft ? (
                          <p className="text-[11px] font-medium text-[#974B35] truncate">Make a plan · {rowDaysLeft}</p>
                        ) : last && (
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
                    Attend an event to join its group chat.
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
                        <UsersRound className="h-4 w-4 text-accent-strong" />
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

          </div>
        </aside>

        {/* Desktop always shows this column; smaller screens only once a conversation is open. */}
        <section className={cn('flex-1 flex-col min-w-0', mobileThread ? 'flex' : 'hidden lg:flex')}>
          {category === 'groups' ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-8 text-center">
              Pick a group chat on the left to jump back in.
            </div>
          ) : partner ? (
            <>
              {/* Right padding keeps the social icons clear of the window's close X. */}
              <div className="p-3 pr-12 border-b flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMobileThread(false)}
                  aria-label="Back to all messages"
                  className="lg:hidden -ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
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
                {/* A one-to-one chat only exists between connections, so their social links show here. */}
                {partner?.social && (
                  <SocialLinkIcons links={partner.social} className="ml-auto shrink-0 gap-3" iconClassName="h-[18px] w-[18px]" />
                )}
              </div>
              {/* Your memory of how you met: the same keywords as on the Connections page, private to you. */}
              <div className="border-b px-3 py-2">
                <ConnectionNoteField key={partner.id} personId={partner.id} firstName={firstName} />
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {showStarters && prompts ? (
                  // First chat after a mutual tag: who you are to each other, what you share, ideas to say
                  // hello, and a nudge to make a plan within the week.
                  <div key={activeId} className="mx-auto flex max-w-sm flex-col gap-6 pb-2 pt-2">
                    <div className={`flex flex-col items-center text-center ${revealItem}`} style={revealDelay(0)}>
                      <div className="flex -space-x-2">
                        {me?.photo ? (
                          <img src={me.photo} alt="You" referrerPolicy="no-referrer" className="h-11 w-11 rounded-full object-cover ring-2 ring-background" />
                        ) : (
                          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F6E2CF] text-sm font-semibold text-[#974B35] ring-2 ring-background">
                            {initials(`${me?.firstName ?? ''} ${me?.lastName ?? ''}`)}
                          </span>
                        )}
                        <img src={partner.avatar} alt={partner.name} className="h-11 w-11 rounded-full object-cover ring-2 ring-background" />
                      </div>
                      <h3 className="mt-3 text-lg font-light tracking-[0.015em] text-[#974B35]">
                        You and {firstName} tagged each other
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">Only the two of you can see this chat.</p>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Met at <span className="text-foreground">{metTag.eventTitle}</span>
                        {metEvent && metEvent.date.getTime() < Date.now() && ` · ${format(metEvent.date, 'EEE d MMM')}`}
                        {sameHood && ` · Both in ${partner.neighborhood?.split(',')[0]}`}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <p className={`text-xs font-semibold text-muted-foreground ${revealItem}`} style={revealDelay(1)}>Say hello</p>
                      {prompts.hello.map((text, i) => (
                        <button
                          key={text}
                          type="button"
                          onClick={() => fillDraft(text)}
                          className={`rounded-2xl border border-border bg-white px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-[#9EAFAB]/30 ${revealItem}`}
                          style={revealDelay(i + 2)}
                        >
                          {text}
                        </button>
                      ))}
                    </div>

                    <div className={`flex flex-col gap-2 ${revealItem}`} style={revealDelay(4)}>
                      <p className="text-xs font-semibold text-muted-foreground">Make a plan</p>
                      <p className="text-xs font-medium text-[#974B35]">
                        {daysLeft
                          ? `Within the week, while it's fresh. ${daysLeft}.`
                          : "It's been over a week. A quick hello still works."}
                      </p>
                      {/* Events to go to together: another of the same first, then the same category. */}
                      {suggestions.map(ev => (
                        <div key={ev.id} className="flex items-center gap-3 rounded-2xl border border-border bg-white p-2.5">
                          <img src={ev.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-foreground">{ev.title}</p>
                            <p className="text-xs text-muted-foreground">{format(ev.date, 'EEE d MMM')} · {ev.time}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => fillDraft(planInvite(ev))}
                            className="min-h-11 shrink-0 rounded px-3 text-sm font-medium text-[#974B35] hover:text-[#7A3C2A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            Suggest
                          </button>
                        </div>
                      ))}
                      {/* Or simply the same again, informally: "Up for another run this week?" */}
                      <button
                        type="button"
                        onClick={() => fillDraft(prompts.plan)}
                        className="rounded-2xl border border-border bg-white px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-[#9EAFAB]/30"
                      >
                        {prompts.plan}
                      </button>
                    </div>
                  </div>
                ) : thread.length === 0 && (
                  <p className="text-xs text-center text-muted-foreground mt-8">
                    Say hi to {firstName}.
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
                  ref={inputRef}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder={`Message ${firstName}...`}
                  className="flex-1"
                />
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
