import { useMemo } from 'react';
import { Event, Participant } from '@/types/event';
import { useEvents } from '@/context/EventsContext';
import { useAttending } from '@/context/AttendingContext';
import { useActivityHistory } from '@/context/ActivityHistoryContext';
import EventCard from './EventCard';
import {
  activitySteps,
  isFirstEventFriendly,
  isNewcomerFriendly,
  pickFirstEvent,
} from '@/lib/memberStart';

interface Props {
  profileInterests: string[];
  onAttend: (id: string) => void;
  onParticipantClick?: (p: Participant) => void;
  onOpenGroupChat?: (e: Event) => void;
}

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-semibold text-primary">{children}</p>
);

/**
 * The top of a member's home: an easy event to start with.
 * (The activity log is on the profile page.)
 */
const MemberStartSection = ({ profileInterests, onAttend, onParticipantClick, onOpenGroupChat }: Props) => {
  const { events } = useEvents();
  const { isAttending, getAttendingEvents } = useAttending();
  const { tags, isConnected } = useActivityHistory();

  const joined = getAttendingEvents(events);
  const mutual = new Set(tags.filter(t => isConnected(t.participantId)).map(t => t.participantId)).size;
  const { attended, next } = activitySteps(joined, mutual);
  const isNew = attended.length === 0;

  // The first-event card: a joined event if it's an easy first one, else the best pick.
  const firstEvent = useMemo(
    () =>
      (isNew && next && isFirstEventFriendly(next) ? next : null) ??
      pickFirstEvent(events, profileInterests, isAttending),
    [isNew, next, events, profileInterests, isAttending],
  );
  const goingToFirst = !!firstEvent && firstEvent === next;

  return (
    <section className="py-8" aria-label="Your start in Porto">
      <div className="container px-4 md:px-6">
        <div id="first-event" className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start scroll-mt-32">

          {/* 1) Try your first event */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Eyebrow>{isNew ? (goingToFirst ? 'Your first event' : 'Try your first event') : 'Try something this week'}</Eyebrow>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-foreground">
                  {goingToFirst ? "You're going" : 'A good place to start'}
                </h2>
                {firstEvent && isNewcomerFriendly(firstEvent) && (
                  <span className="rounded-full bg-event-card px-2.5 py-0.5 text-xs font-semibold text-event-card-foreground">
                    Good for newcomers
                  </span>
                )}
              </div>
            </div>
            {firstEvent ? (
              <EventCard
                event={firstEvent}
                onAttend={onAttend}
                onParticipantClick={onParticipantClick}
                onOpenGroupChat={onOpenGroupChat}
              />
            ) : (
              <div className="rounded-2xl bg-card p-6 text-sm text-muted-foreground">
                No coffee meetups, walks or meditation sessions open to everyone in the next two weeks yet. New events land every day.
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
};

export default MemberStartSection;
