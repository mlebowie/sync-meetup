import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Users, MapPin, Check, UserPlus } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSocial } from '@/context/SocialContext';
import { useActivityHistory } from '@/context/ActivityHistoryContext';
import { suggestGroups } from '@/lib/groupFormation';
import { mockParticipants } from '@/data/mockData';
import ParticipantProfileDialog from '@/components/ParticipantProfileDialog';
import UnfollowConfirmDialog from '@/components/UnfollowConfirmDialog';
import { Participant } from '@/types/event';

type FilterKey = 'all' | 'weMet' | 'tagged' | 'crew' | 'mutual' | 'followers' | 'following';

interface EnrichedParticipant {
  participant: Participant;
  youFollow: boolean;
  followsYou: boolean;
  mutual: boolean;
  relationship: 'mutual' | 'followers' | 'following';
  coAttended: boolean;
  tagged: boolean;
  inCrew: boolean;
}

const Connections = () => {
  const { following, followers, toggleFollow } = useSocial();
  const { history, tags, hasTaggedMe, crossedPathsWith } = useActivityHistory();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [taggedEventId, setTaggedEventId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [profileId, setProfileId] = useState<string | null>(null);
  const [unfollowId, setUnfollowId] = useState<string | null>(null);

  const crews = useMemo(() => {
    const mutualSet = new Set<string>();
    followers.forEach(id => { if (following.has(id)) mutualSet.add(id); });
    tags.forEach(t => { if (hasTaggedMe(t.participantId)) mutualSet.add(t.participantId); });
    return suggestGroups(history, tags, mutualSet);
  }, [history, tags, followers, following, hasTaggedMe]);

  const enriched = useMemo<EnrichedParticipant[]>(() => {
    const ids = new Set<string>([...following, ...followers]);
    return Array.from(ids)
      .map(id => mockParticipants.find(p => p.id === id))
      .filter((p): p is Participant => Boolean(p))
      .map(p => {
        const youFollow = following.has(p.id);
        const followsYou = followers.has(p.id);
        const mutual = youFollow && followsYou;
        const relationship: 'mutual' | 'followers' | 'following' = mutual
          ? 'mutual'
          : followsYou
            ? 'followers'
            : 'following';
        return {
          participant: p,
          youFollow,
          followsYou,
          mutual,
          relationship,
          coAttended: crossedPathsWith(p.id) > 0,
          tagged: tags.some(t => t.participantId === p.id),
          inCrew: crews.some(g => g.memberIds.includes(p.id)),
        };
      });
  }, [following, followers, crossedPathsWith, tags, hasTaggedMe, crews]);

  const counts = useMemo(
    () => ({
      all: enriched.length,
      weMet: enriched.filter(e => e.coAttended).length,
      tagged: enriched.filter(e => e.tagged).length,
      taggedMe: enriched.filter(e => e.taggedMe).length,
      crew: enriched.filter(e => e.inCrew).length,
      mutual: enriched.filter(e => e.mutual).length,
      followers: enriched.filter(e => e.relationship === 'followers').length,
      following: enriched.filter(e => e.relationship === 'following').length,
    }),
    [enriched],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enriched
      .filter(e => {
        if (filter === 'all') return true;
        if (filter === 'weMet') return e.coAttended;
        if (filter === 'tagged') {
          if (!e.tagged) return false;
          if (taggedEventId) {
            return tags.some(t => t.participantId === e.participant.id && t.eventId === taggedEventId);
          }
          return true;
        }
        if (filter === 'taggedMe') return e.taggedMe;
        if (filter === 'crew') return e.inCrew;
        if (filter === 'mutual') return e.mutual;
        if (filter === 'followers') return e.relationship === 'followers';
        if (filter === 'following') return e.relationship === 'following';
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
        if (a.mutual !== b.mutual) return a.mutual ? -1 : 1;
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
    { key: 'all', label: 'All' },
    { key: 'weMet', label: 'We Met' },
    { key: 'tagged', label: 'Tagged' },
    { key: 'taggedMe', label: 'Tagged Me' },
    { key: 'crew', label: 'Crew' },
    { key: 'mutual', label: 'Mutual' },
    { key: 'followers', label: 'Follows you' },
    { key: 'following', label: 'You follow' },
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
          <h1 className="text-2xl font-bold">Connections</h1>
          <span className="text-sm text-muted-foreground">({counts.all})</span>
        </div>

        <div className="relative mb-4">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or neighborhood"
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
            <p className="text-muted-foreground">No connections to show.</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Follow people from event participant lists to grow your network.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map(({ participant, mutual, relationship, youFollow, coAttended, tagged, taggedMe, inCrew }) => (
              <li
                key={participant.id}
                className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:shadow-card-hover transition-shadow"
              >
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
                      <span className="px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-medium uppercase tracking-wide">
                        {mutual ? 'Mutual' : relationship === 'followers' ? 'Follows you' : 'You follow'}
                      </span>
                      {coAttended && (
                        <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium uppercase tracking-wide">
                          We Met
                        </span>
                      )}
                      {tagged && (
                        <span className="px-1.5 py-0.5 rounded-full bg-accent/40 text-accent-foreground text-[10px] font-medium uppercase tracking-wide">
                          Tagged
                        </span>
                      )}
                      {taggedMe && (
                        <span className="px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-medium uppercase tracking-wide">
                          Tagged Me
                        </span>
                      )}
                      {inCrew && (
                        <span className="px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-medium uppercase tracking-wide">
                          Crew
                        </span>
                      )}
                    </div>
                    {filter === 'tagged' && tagged && (() => {
                      const t = tags.find(x => x.participantId === participant.id);
                      if (!t) return null;
                      return (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          Tagged at <span className="font-medium text-foreground">{t.eventTitle}</span>
                          {' · '}
                          {new Date(t.taggedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      );
                    })()}
                  </div>
                </button>
                <Button
                  size="sm"
                  variant={youFollow ? 'outline' : 'default'}
                  onClick={() => {
                    if (youFollow) setUnfollowId(participant.id);
                    else toggleFollow(participant.id);
                  }}
                  className="shrink-0"
                >
                  {youFollow ? (
                    <><Check className="h-4 w-4 mr-1" /> Following</>
                  ) : (
                    <><UserPlus className="h-4 w-4 mr-1" /> Follow back</>
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}

        <ParticipantProfileDialog
          participant={profileId ? mockParticipants.find(p => p.id === profileId) ?? null : null}
          open={!!profileId}
          onOpenChange={open => !open && setProfileId(null)}
        />
        <UnfollowConfirmDialog
          open={!!unfollowId}
          name={unfollowId ? mockParticipants.find(p => p.id === unfollowId)?.name ?? '' : ''}
          onOpenChange={open => !open && setUnfollowId(null)}
          onConfirm={() => unfollowId && toggleFollow(unfollowId)}
        />
      </main>
    </div>
  );
};

export default Connections;
