import { useMemo } from 'react';
import { Check, MapPin } from 'lucide-react';
import { Event, Participant } from '@/types/event';
import { useEvents } from '@/context/EventsContext';
import { useAttending } from '@/context/AttendingContext';
import { useActivityHistory } from '@/context/ActivityHistoryContext';
import EventCard from './EventCard';
import {
  activitySteps,
  interestLabel,
  isFirstEventFriendly,
  isNewcomerFriendly,
  pickFirstEvent,
  placesThisMonth,
} from '@/lib/memberStart';
import { cn } from '@/lib/utils';

interface Props {
  profileInterests: string[];
  onAttend: (id: string) => void;
  onParticipantClick?: (p: Participant) => void;
  onOpenGroupChat?: (e: Event) => void;
}

// One colour per interest, in the order the member picked them.
const DOTS = ['bg-primary', 'bg-accent-strong', 'bg-foreground/70', 'bg-accent', 'bg-muted-foreground'];

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-semibold text-primary">{children}</p>
);

/**
 * Three cards for the top of a member's home: an easy event to start with,
 * where their interests happen in Porto this month, and their activity log.
 */
const MemberStartSection = ({ profileInterests, onAttend, onParticipantClick, onOpenGroupChat }: Props) => {
  const { events } = useEvents();
  const { isAttending, getAttendingEvents } = useAttending();
  const { tags, isConnected } = useActivityHistory();

  const joined = getAttendingEvents(events);
  const mutual = new Set(tags.filter(t => isConnected(t.participantId)).map(t => t.participantId)).size;
  const { steps, attended, next } = activitySteps(joined, mutual);
  const isNew = attended.length === 0;

  // The first-event card: a joined event if it's an easy first one, else the best pick.
  const firstEvent = useMemo(
    () =>
      (isNew && next && isFirstEventFriendly(next) ? next : null) ??
      pickFirstEvent(events, profileInterests, isAttending),
    [isNew, next, events, profileInterests, isAttending],
  );
  const goingToFirst = !!firstEvent && firstEvent === next;
  const places = useMemo(() => placesThisMonth(events, profileInterests), [events, profileInterests]);
  const month = new Date().toLocaleDateString('en-GB', { month: 'long' });
  const dotFor = (id: string) => DOTS[Math.max(0, profileInterests.indexOf(id)) % DOTS.length];
  const doneCount = steps.filter(s => s.done).length;

  return (
    <section className="py-8" aria-label="Your start in Porto">
      <div className="container px-4 md:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">

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
                No coffee meetups, coworking or chill events open to everyone in the next two weeks yet. New events land every day.
              </div>
            )}
          </div>

          {/* 2) Porto this month */}
          <div className="rounded-2xl bg-event-card text-event-card-foreground p-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Eyebrow>Porto this month</Eyebrow>
              <h2 className="text-xl font-bold text-foreground">
                Where your interests happen in {month}
              </h2>
            </div>
            {places.length ? (
              <ul className="flex flex-col gap-3.5">
                {places.map(place => {
                  const labels = profileInterests.length
                    ? place.interestIds.map(id => ({ key: id, label: interestLabel(id), dot: dotFor(id) }))
                    : place.categories.slice(0, 2).map((c, i) => ({ key: c, label: c, dot: DOTS[i] }));
                  return (
                    <li key={place.name} className="flex items-start justify-between gap-3">
                      <span className="flex items-center gap-2 font-semibold text-foreground">
                        <MapPin className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                        {place.name}
                      </span>
                      <span className="flex flex-col items-end gap-1 text-right">
                        <span className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {labels.map(l => (
                            <span key={l.key} className="inline-flex items-center gap-1.5">
                              <span className={cn('h-2 w-2 rounded-full', l.dot)} aria-hidden="true" />
                              {l.label}
                            </span>
                          ))}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {place.count} {place.count === 1 ? 'event' : 'events'}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nothing listed for your interests in {month} yet. Try adding another interest above.
              </p>
            )}
            <a href="#upcoming" className="text-sm font-semibold text-primary underline-offset-4 hover:underline mt-1">
              Browse upcoming events
            </a>
          </div>

          {/* 3) Your activity log */}
          <div
            className={cn(
              'rounded-2xl p-6 flex flex-col gap-4 md:col-span-2 lg:col-span-1',
              doneCount === 0 ? 'border-2 border-dashed border-border' : 'bg-card',
            )}
          >
            <div className="flex flex-col gap-1">
              <Eyebrow>Your activity log</Eyebrow>
              <h2 className="text-xl font-bold text-foreground">
                {doneCount === 0 ? 'Starts with your first event' : `${doneCount} of 3 steps done`}
              </h2>
              <p className="text-sm text-muted-foreground">
                {doneCount === 0
                  ? 'People you meet appear here afterwards, once you both choose to meet again.'
                  : 'Every event you go to adds to your history. Keep showing up and a crew forms.'}
              </p>
            </div>
            <ol className="flex flex-col">
              {steps.map((step, i) => {
                const current = !step.done && steps.slice(0, i).every(s => s.done);
                return (
                  <li key={step.label} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full border-2',
                          step.done
                            ? 'border-primary bg-primary text-primary-foreground'
                            : current
                              ? 'border-primary bg-event-card'
                              : 'border-border',
                        )}
                      >
                        {step.done && <Check className="h-3 w-3" aria-hidden="true" />}
                      </span>
                      {i < steps.length - 1 && <span className="w-0.5 flex-1 min-h-6 bg-border" />}
                    </div>
                    <div className="pb-4">
                      <p className={cn('text-sm', step.done || current ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                        {step.label}
                        <span className="sr-only">{step.done ? ' (done)' : current ? ' (next)' : ''}</span>
                      </p>
                      {step.detail && <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
            {attended.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <p className="text-xs font-semibold text-muted-foreground">Recently</p>
                <ul className="flex flex-col gap-1.5 text-sm">
                  {attended.slice(0, 3).map(e => (
                    <li key={e.id} className="flex justify-between gap-3">
                      <span className="truncate text-foreground">{e.title}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {e.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
};

export default MemberStartSection;
