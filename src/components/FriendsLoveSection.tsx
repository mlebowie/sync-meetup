import { useMemo, useState } from 'react';
import { mockEvents } from '@/data/mockData';
import { useSocial } from '@/context/SocialContext';
import { Event, Participant } from '@/types/event';
import ExpandableEventGrid from './ExpandableEventGrid';
import EventCarousel from './EventCarousel';
import SectionFilterBar, { SectionFilters, defaultSectionFilters, applySectionFilters } from './SectionFilterBar';
import { matchesInterests } from '@/lib/userProfile';
import { Heart, Users } from 'lucide-react';



interface Props {
  onAttend: (id: string) => void;
  onParticipantClick?: (p: Participant) => void;
  onOpenGroupChat?: (e: Event) => void;
  interests?: string[];
}

// Anchor events across the next couple of weeks
const WEEK_OFFSETS = [1, 3, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map(d => d * 24 * 60 * 60 * 1000);


const FriendsLoveSection = ({ onAttend, onParticipantClick, onOpenGroupChat, interests = [] }: Props) => {
  const { following } = useSocial();

  const events: Event[] = useMemo(() => {
    // Find events where followed users attend regularly (in participants OR recurring series match)
    const pool0 = mockEvents.filter(e => matchesInterests(e, interests));
    const scored = pool0.map(e => {
      let score = 0;
      const friendsAttending: Participant[] = [];
      e.participants.forEach(p => {
        if (following.has(p.id)) {
          friendsAttending.push(p);
          score += 2;
          // Bonus if event is in their recurring series
          if (e.seriesId && p.recurringSeries?.some(s => s.toLowerCase().includes(e.seriesId!.toLowerCase().replace('-', ' ')))) {
            score += 3;
          }
        }
      });
      return { event: e, score, friendsAttending };
    });

    let pool = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score);
    // Fallback when user follows no one — show popular recurring events
    if (pool.length === 0) {
      pool = pool0
        .filter(e => e.recurrence && e.recurrence !== 'one-off')
        .slice(0, 13)
        .map(e => ({ event: e, score: 1, friendsAttending: [] }));
    }
    return pool.slice(0, 13).map((s, i) => ({
      ...s.event,
      date: new Date(Date.now() + WEEK_OFFSETS[i % WEEK_OFFSETS.length]),
    }));
  }, [following, interests]);

  const [filters, setFilters] = useState<SectionFilters>(defaultSectionFilters);
  const [showAll, setShowAll] = useState(false);
  const visible = useMemo(() => applySectionFilters(events, filters), [events, filters]);

  if (events.length === 0) return null;

  const hasFriends = following.size > 0;

  return (
    <section className="py-8 md:py-12">
      <div className="container px-4 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-accent-strong font-semibold mb-1">
              <Heart className="h-3.5 w-3.5 fill-current" />
              Events your friends love
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">
              {hasFriends ? 'Where your people keep showing up' : 'Recurring events the community loves'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {hasFriends
                ? 'Events where people you follow attend regularly'
                : 'Follow a few faces to see where they regularly show up'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAll(v => !v)}
            className="text-sm font-semibold text-primary hover:underline"
          >
            {showAll ? 'Show as carousel' : `See all (${visible.length})`}
          </button>
        </div>

        <SectionFilterBar value={filters} onChange={setFilters} />

        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No events match those filters yet.</p>
        ) : showAll ? (
          <ExpandableEventGrid
            events={visible}
            onAttend={onAttend}
            onParticipantClick={onParticipantClick}
            onOpenGroupChat={onOpenGroupChat}
          />
        ) : (
          <EventCarousel
            events={visible}
            onAttend={onAttend}
            onParticipantClick={onParticipantClick}
            onOpenGroupChat={onOpenGroupChat}
          />
        )}

      </div>

    </section>
  );
};

export default FriendsLoveSection;
