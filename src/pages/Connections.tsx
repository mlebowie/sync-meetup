import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Users, MapPin, Check, UserPlus } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSocial } from '@/context/SocialContext';
import { mockParticipants } from '@/data/mockData';
import ParticipantProfileDialog from '@/components/ParticipantProfileDialog';
import UnfollowConfirmDialog from '@/components/UnfollowConfirmDialog';
import { Participant } from '@/types/event';

type FilterKey = 'all' | 'mutual' | 'followers' | 'following';

const Connections = () => {
  const { following, followers, toggleFollow } = useSocial();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [query, setQuery] = useState('');
  const [profileId, setProfileId] = useState<string | null>(null);

  const enriched = useMemo(() => {
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
        return { participant: p, youFollow, followsYou, mutual, relationship };
      });
  }, [following, followers]);

  const counts = useMemo(
    () => ({
      all: enriched.length,
      mutual: enriched.filter(e => e.mutual).length,
      followers: enriched.filter(e => e.relationship === 'followers').length,
      following: enriched.filter(e => e.relationship === 'following').length,
    }),
    [enriched],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enriched
      .filter(e => (filter === 'all' ? true : e.relationship === filter))
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
  }, [enriched, filter, query]);

  const pills: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
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
                onClick={() => setFilter(pill.key)}
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
            {filtered.map(({ participant, mutual, relationship, youFollow }) => (
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
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {participant.neighborhood && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{participant.neighborhood}</span>
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-medium uppercase tracking-wide">
                        {mutual ? 'Mutual' : relationship === 'followers' ? 'Follows you' : 'You follow'}
                      </span>
                    </div>
                  </div>
                </button>
                <Button
                  size="sm"
                  variant={youFollow ? 'outline' : 'default'}
                  onClick={() => toggleFollow(participant.id)}
                  className="shrink-0"
                >
                  {youFollow ? 'Following' : 'Follow back'}
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
      </main>
    </div>
  );
};

export default Connections;
