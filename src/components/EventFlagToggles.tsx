import { cn } from '@/lib/utils';

export interface EventFlags {
  women_only: boolean;
  lgbtq_friendly: boolean;
  pet_friendly: boolean;
}

const FLAGS: { key: keyof EventFlags; label: string }[] = [
  { key: 'women_only', label: 'Women only' },
  { key: 'lgbtq_friendly', label: 'LGBTQ+ friendly' },
  { key: 'pet_friendly', label: 'Pet friendly' },
];

interface Props {
  value: EventFlags;
  onChange: (next: EventFlags) => void;
}

/** The three audience filters people can use in the feed; tap to switch on or off. */
const EventFlagToggles = ({ value, onChange }: Props) => (
  <div className="flex flex-wrap gap-2" role="group" aria-label="Event filters">
    {FLAGS.map(({ key, label }) => {
      const on = value[key];
      return (
        <button
          key={key}
          type="button"
          aria-pressed={on}
          onClick={() => onChange({ ...value, [key]: !on })}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
            on
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-muted-foreground border-border hover:text-foreground',
          )}
        >
          {on ? '✓ ' : ''}
          {label}
        </button>
      );
    })}
  </div>
);

export default EventFlagToggles;
