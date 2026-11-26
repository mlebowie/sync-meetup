import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Users, MapPin, StickyNote } from 'lucide-react';

import Header from '@/components/Header';
import { Input } from '@/components/ui/input';
import { useActivityHistory } from '@/context/ActivityHistoryContext';
import { useAttending } from '@/context/AttendingContext';
import { useEvents } from '@/context/EventsContext';
import { activitySteps } from '@/lib/memberStart';
import { Button } from '@/components/ui/button';
import { primaryCta } from '@/lib/ctaStyles';
import { mockParticipants } from '@/data/mockData';
import ParticipantProfileDialog from '@/components/ParticipantProfileDialog';
import { Participant } from '@/types/event';

// One relationship: a connection is two people who were at the same event and tagged each other.
// Your own tags stay private until they are returned; there is no one-way following.
type FilterKey = 'connected' | 'tagged';

interface EnrichedParticipant {
  participant: Participant;
  connected: boolean;
  tagged: boolean;
}

const Connections = () => {
  const { tags, isConnected } = useActivityHistory();
  const navigate = useNavigate();
  // New members haven't been to an event yet: "first"; everyone else: "next".
  const { events } = useEvents();
  const { getAttendingEvents } = useAttending();
  const { attended } = activitySteps(getAttendingEvents(events), 0);
  const ctaLabel = attended.length === 0 ? 'Attend your first event' : 'Attend your next event';
  const [filter, setFilter] = useState<FilterKey>('connected');
  const [taggedEventId, setTaggedEventId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [profileId, setProfileId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem('sync:tag-notes');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('sync:tag-notes', JSON.stringify(notes));
    } catch {
      // ignore
    }
  }, [notes]);

  const noteKey = (participantId: string, eventId: string) => `${participantId}::${eventId}`;



  const enriched = useMemo<EnrichedParticipant[]>(() => {
    // Everyone you have tagged after an event: connected if they tagged you back, otherwise a private pending tag.
    const ids = new Set<string>(tags.map(t => t.participantId));
    return Array.from(ids)
      .map(id => mockParticipants.find(p => p.id === id))
      .filter((p): p is Participant => Boolean(p))
      .map(p => ({
        participant: p,
        connected: isConnected(p.id),
        tagged: tags.some(t => t.participantId === p.id),
      }));
  }, [tags, isConnected]);

  const counts = useMemo(
    () => ({
      connected: enriched.filter(e => e.connected).length,
      tagged: enriched.filter(e => e.tagged && !e.connected).length,
    }),
    [enriched],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enriched
      .filter(e => {
        if (filter === 'connected') return e.connected;
        if (filter === 'tagged') {
          if (!e.tagged || e.connected) return false;
          if (taggedEventId) {
            return tags.some(t => t.participantId === e.participant.id && t.eventId === taggedEventId);
          }
          return true;
        }
        return true;
      })
      .filter(e => {
        if (!q) return true;
        return (
          e.participant.name.toLowerCase().includes(q) ||
          (e.participant.neighborhood ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.connected !== b.connected) return a.connected ? -1 : 1;
        return a.participant.name.localeCompare(b.participant.name);
      });
  }, [enriched, filter, query, taggedEventId, tags]);

  const taggedEvents = useMemo(() => {
    const map = new Map<string, { eventId: string; eventTitle: string; taggedAt: Date; count: number }>();
    tags.forEach(t => {
      const existing = map.get(t.eventId);
      if (existing) {
        existing.count += 1;
        if (t.taggedAt > existing.taggedAt) existing.taggedAt = t.taggedAt;
      } else {
        map.set(t.eventId, { eventId: t.eventId, eventTitle: t.eventTitle, taggedAt: t.taggedAt, count: 1 });
      }
    });
    return Array.from(map.values()).sort((a, b) => +b.taggedAt - +a.taggedAt);
  }, [tags]);

  const pills: { key: FilterKey; label: string }[] = [
    { key: 'connected', label: 'Connections' },
    { key: 'tagged', label: 'Your tags' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 md:px-6 py-8 max-w-3xl">
        <Link to="/profile" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to profile
        </Link>

        <div className="flex items-center gap-2 mb-6">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-light tracking-[0.015em]">Connections</h1>
          <span className="text-sm text-muted-foreground">({counts.connected})</span>
        </div>

        {/* The two ideas, in one line each, under the tabs below. */}
        <p className="-mt-3 mb-5 text-sm text-muted-foreground">
          {filter === 'connected'
            ? 'People you met at an event who tagged you back. You can message each other and see each other\'s social links.'
            : 'People you tagged who have not tagged you back yet. Only you can see this list.'}
        </p>

        <div className="relative mb-4">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or neighbourhood"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {pills.map(pill => {
            const active = filter === pill.key;
            return (
              <button
                key={pill.key}
                onClick={() => { setFilter(pill.key); if (pill.key !== 'tagged') setTaggedEventId(null); }}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card hover:bg-muted border-border text-foreground'
                }`}
              >
                {pill.label}
                <span className={`ml-1.5 text-xs ${active ? 'opacity-80' : 'text-muted-foreground'}`}>
                  {counts[pill.key]}
                </span>
              </button>
            );
          })}
        </div>

        {filter === 'tagged' && taggedEvents.length > 0 && (
          <div className="mb-6 -mt-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Filter by event</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTaggedEventId(null)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  !taggedEventId
                    ? 'bg-accent text-accent-foreground border-accent'
                    : 'bg-card hover:bg-muted border-border'
                }`}
              >
                All events
              </button>
              {taggedEvents.map(ev => {
                const active = taggedEventId === ev.eventId;
                return (
                  <button
                    key={ev.eventId}
                    onClick={() => setTaggedEventId(active ? null : ev.eventId)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      active
                        ? 'bg-accent text-accent-foreground border-accent'
                        : 'bg-card hover:bg-muted border-border'
                    }`}
                  >
                    {ev.eventTitle}
                    <span className="ml-1.5 opacity-70">
                      · {new Date(ev.taggedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}


        {filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed rounded-2xl">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">{filter === 'connected' ? 'No connections yet.' : 'No pending tags.'}</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Tag people after an event. When they tag you back, you're connected.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map(({ participant, tagged }) => (
              <li
                key={participant.id}
                className="p-3 rounded-xl border bg-card hover:shadow-card-hover transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setProfileId(participant.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <img
                      src={participant.avatar}
                      alt={participant.name}
                      className="h-12 w-12 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{participant.name}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {participant.neighborhood && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{participant.neighborhood}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
                {filter === 'tagged' && tagged && (() => {
                  const relevantTags = tags.filter(x =>
                    x.participantId === participant.id &&
                    (!taggedEventId || x.eventId === taggedEventId),
                  );
                  if (relevantTags.length === 0) return null;
                  return (
                    <div className="mt-3 pl-15 space-y-2">
                      {relevantTags.map(t => {
                        const key = noteKey(participant.id, t.eventId);
                        return (
                          <div key={key} className="rounded-lg border bg-muted/30 p-2">
                            <p className="text-xs text-muted-foreground">
                              Tagged at <span className="font-medium text-foreground">{t.eventTitle}</span>
                              {' · '}
                              {new Date(t.taggedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <StickyNote className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <Input
                                value={notes[key] ?? ''}
                                onChange={e => setNotes(prev => ({ ...prev, [key]: e.target.value }))}
                                placeholder="Add keywords (last convo, interests, vibe...)"
                                maxLength={140}
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </li>

            ))}
          </ul>
        )}

        {/* Connections only come from events, so the way to grow this list is the next event. */}
        <div className="mt-10">
          <Button type="button" className={primaryCta} onClick={() => navigate('/?find=event')}>
            {ctaLabel}
          </Button>
        </div>

        <ParticipantProfileDialog
          participant={profileId ? mockParticipants.find(p => p.id === profileId) ?? null : null}
          open={!!profileId}
          onOpenChange={open => !open && setProfileId(null)}
        />
      </main>
    </div>
  );
};

export default Connections;
