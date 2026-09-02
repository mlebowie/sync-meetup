import { Event, GroupSize } from '@/types/event';

export interface SectionFilters {
  time: 'any' | 'week' | 'month';
  size: 'any' | GroupSize;
  womenOnly: boolean;
  lgbtqFriendly: boolean;
  petFriendly: boolean;
}

export const defaultSectionFilters: SectionFilters = {
  time: 'any',
  size: 'any',
  womenOnly: false,
  lgbtqFriendly: false,
  petFriendly: false,
};

export const applySectionFilters = (events: Event[], f: SectionFilters) => {
  const now = Date.now();
  const windows = { any: Infinity, week: 7 * 864e5, month: 30 * 864e5 };
  return events.filter(e => {
    const diff = e.date.getTime() - now;
    if (windows[f.time] !== Infinity && (diff < 0 || diff > windows[f.time])) return false;
    if (f.size !== 'any' && e.groupSize !== f.size) return false;
    if (f.womenOnly && !e.womenOnly) return false;
    if (f.lgbtqFriendly && !e.lgbtqFriendly) return false;
    if (f.petFriendly && !e.petFriendly) return false;
    return true;
  });
};

const pill = (active: boolean) =>
  `px-3 py-1 rounded-full text-xs font-medium transition-all ${
    active ? 'bg-primary text-primary-foreground shadow-button' : 'bg-muted text-muted-foreground hover:bg-muted/80'
  }`;

interface Props {
  value: SectionFilters;
  onChange: (f: SectionFilters) => void;
}

/** Slim inline filter row for a single homepage section. */
const SectionFilterBar = ({ value, onChange }: Props) => {
  const set = (patch: Partial<SectionFilters>) => onChange({ ...value, ...patch });
  const isDefault = JSON.stringify(value) === JSON.stringify(defaultSectionFilters);

  return (
    <div className="flex flex-wrap items-center gap-2 mb-5">
      <button className={pill(value.time === 'week')} onClick={() => set({ time: value.time === 'week' ? 'any' : 'week' })}>
        This week
      </button>
      <button className={pill(value.time === 'month')} onClick={() => set({ time: value.time === 'month' ? 'any' : 'month' })}>
        This month
      </button>

      <span className="h-4 w-px bg-border mx-1" />

      {(['small', 'medium', 'large'] as GroupSize[]).map(s => (
        <button key={s} className={pill(value.size === s)} onClick={() => set({ size: value.size === s ? 'any' : s })}>
          {s.charAt(0).toUpperCase() + s.slice(1)}
        </button>
      ))}

      <span className="h-4 w-px bg-border mx-1" />

      <button className={pill(value.womenOnly)} onClick={() => set({ womenOnly: !value.womenOnly })}>
        Women only
      </button>
      <button className={pill(value.lgbtqFriendly)} onClick={() => set({ lgbtqFriendly: !value.lgbtqFriendly })}>
        LGBTQ+ friendly
      </button>
      <button className={pill(value.petFriendly)} onClick={() => set({ petFriendly: !value.petFriendly })}>
        Pet friendly
      </button>

      {!isDefault && (
        <button
          className="text-xs font-medium text-primary hover:underline ml-1"
          onClick={() => onChange(defaultSectionFilters)}
        >
          Clear
        </button>
      )}
    </div>
  );
};

export default SectionFilterBar;
