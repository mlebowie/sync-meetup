import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type Repeat = 'one-off' | 'weekly' | 'biweekly' | 'monthly';

export interface RepeatValue {
  recurrence: Repeat;
  /** Last date of the series (YYYY-MM-DD), or '' for no end. */
  until: string;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ORDINALS = ['1st', '2nd', '3rd', '4th', 'last'];

/** "every Wednesday", "every other Wednesday", "the 2nd Wednesday of each month". */
export function describeRepeat(recurrence: Repeat, date: string): string {
  if (!date || recurrence === 'one-off') return '';
  const d = new Date(`${date}T12:00:00`);
  const day = WEEKDAYS[d.getDay()];
  if (recurrence === 'weekly') return `every ${day}`;
  if (recurrence === 'biweekly') return `every other ${day}`;
  return `the ${ORDINALS[Math.min(Math.floor((d.getDate() - 1) / 7), 4)]} ${day} of each month`;
}

interface Props {
  value: RepeatValue;
  onChange: (next: RepeatValue) => void;
  /** The event's date (YYYY-MM-DD), used to describe the pattern. */
  date: string;
  /** What the event's source says about repeating, shown as a hint. */
  sourceSays?: string | null;
}

/** "Repeats" and "Until" for an event; each date becomes its own event in the feed. */
const RepeatFields = ({ value, onChange, date, sourceSays }: Props) => {
  const pattern = describeRepeat(value.recurrence, date);
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1 text-xs text-muted-foreground">
          Repeats
          <Select
            value={value.recurrence}
            onValueChange={(v) => onChange({ ...value, recurrence: v as Repeat })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="one-off">Doesn't repeat</SelectItem>
              <SelectItem value="weekly">Every week</SelectItem>
              <SelectItem value="biweekly">Every 2 weeks</SelectItem>
              <SelectItem value="monthly">Every month</SelectItem>
            </SelectContent>
          </Select>
        </label>
        {value.recurrence !== 'one-off' && (
          <label className="space-y-1 text-xs text-muted-foreground">
            Until (optional)
            <Input
              type="date"
              min={date || undefined}
              value={value.until}
              onChange={(e) => onChange({ ...value, until: e.target.value })}
            />
          </label>
        )}
      </div>
      {pattern ? (
        <p className="text-xs text-muted-foreground">
          Repeats {pattern}
          {value.until ? ` until ${value.until}` : ''}. The next six weeks of dates are added as separate events, and
          more are added as time goes on.
        </p>
      ) : sourceSays ? (
        <p className="text-xs text-muted-foreground">
          The source lists this as {sourceSays}. Choose a repeat to add its upcoming dates to SYNC.
        </p>
      ) : null}
    </div>
  );
};

export default RepeatFields;
