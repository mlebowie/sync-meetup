import { useMemo, useState } from 'react';
import { withSampleDate } from '@/lib/sampleDates';
import { useEvents } from '@/context/EventsContext';
import { useActivityHistory } from '@/context/ActivityHistoryContext';
import { Event, Participant } from '@/types/event';
import ExpandableEventGrid from './ExpandableEventGrid';
import EventCarousel from './EventCarousel';
import { matchesInterests } from '@/lib/userProfile';



interface Props {
  onAttend: (id: string) => void;
  onParticipantClick?: (p: Participant) => void;
  onOpenGroupChat?: (e: Event) => void;
  interests?: string[];
}

// Anchor events across the next couple of weeks
const WEEK_OFFSETS = [1, 3, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map(d => d * 24 * 60 * 60 * 1000);


const FriendsLoveSection = ({ onAttend, onParticipantClick, onOpenGroupChat, interests = [] }: Props) => {
  const { events: mockEvents } = useEvents();
  const { connectionIds: following } = useActivityHistory();

  const events: Event[] = useMemo(() => {
    // Find events your connections attend regularly (in participants OR recurring series match)
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
    // Fallback when there are no connections yet: show popular recurring events
    if (pool.length === 0) {
      pool = pool0
        .filter(e => e.recurrence && e.recurrence !== 'one-off')
        .slice(0, 13)
        .map(e => ({ event: e, score: 1, friendsAttending: [] }));
    }
    return pool.slice(0, 13).map((s, i) => withSampleDate(s.event, Date.now() + WEEK_OFFSETS[i % WEEK_OFFSETS.length]));
  }, [mockEvents, following, interests]);

  // Driven by people, not topics, so the feed's filter bar doesn't apply here.
  const [showAll, setShowAll] = useState(false);
  const visible = events;

  // Only for members with connections: it's about where those people show up.
  if (following.size === 0 || events.length === 0) return null;

  const hasFriends = following.size > 0;

  return (
    <section className="py-8 md:py-12">
      <div className="container px-4 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <div className="text-xs uppercase tracking-wide text-accent-strong font-semibold mb-1">
              Events your connections love
            </div>
            <h2 className="text-xl md:text-2xl font-light tracking-[0.015em] text-foreground">
              {hasFriends ? 'Where your people keep showing up' : 'Recurring events the community loves'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {hasFriends
                ? 'Events your connections go to regularly'
                : 'Tag people after events to see where they regularly show up'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAll(v => !v)}
            className="text-sm font-semibold text-primary-text hover:underline"
          >
            {showAll ? 'Show as carousel' : `See all (${visible.length})`}
          </button>
        </div>

        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No events yet.</p>
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
