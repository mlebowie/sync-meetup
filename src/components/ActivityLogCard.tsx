import { Check } from 'lucide-react';
import { useEvents } from '@/context/EventsContext';
import { useAttending } from '@/context/AttendingContext';
import { useActivityHistory } from '@/context/ActivityHistoryContext';
import { activitySteps } from '@/lib/memberStart';
import { cn } from '@/lib/utils';

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-semibold text-primary">{children}</p>
);

/** The member's three steps (join, go, meet again) and recent events. Shown on the profile page. */
const ActivityLogCard = () => {
  const { events } = useEvents();
  const { getAttendingEvents } = useAttending();
  const { tags, isConnected } = useActivityHistory();

  const joined = getAttendingEvents(events);
  const mutual = new Set(tags.filter(t => isConnected(t.participantId)).map(t => t.participantId)).size;
  const { steps, attended } = activitySteps(joined, mutual);
  const doneCount = steps.filter(s => s.done).length;

  return (
    <div
      className={cn(
        'rounded-2xl p-6 flex flex-col gap-4',
        doneCount === 0 ? 'border-2 border-dashed border-border' : 'bg-card',
      )}
    >
      <div className="flex flex-col gap-1">
        <Eyebrow>Your activity log</Eyebrow>
        <h2 className="text-xl font-light tracking-[0.015em] text-foreground">
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
  );
};

export default ActivityLogCard;
