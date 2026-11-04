import { RefObject, useEffect, useRef, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { GroupSize } from '@/types/event';
import { ONBOARDING_INTERESTS } from '@/lib/userProfile';
import {
  DEFAULT_FEED_FILTERS,
  FeedFilters,
  activeFilterCount,
  interestLabel,
} from '@/lib/feedFilters';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  value: FeedFilters;
  onChange: (f: FeedFilters) => void;
  /** The interests saved on the user's profile, shown as chips in the bar. */
  profileInterests: string[];
  /** Adds interests picked from "More" to the user's profile. */
  onSaveInterests: (ids: string[]) => void;
  /** Anchors for the filter tour. */
  interestsRef?: RefObject<HTMLDivElement>;
  inclusivityRef?: RefObject<HTMLDivElement>;
}

const chip = (active: boolean) =>
  `shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 min-h-9 px-3.5 rounded-full text-sm transition-colors ${
    active
      ? 'bg-primary text-primary-foreground font-semibold'
      : 'bg-muted text-muted-foreground font-medium hover:bg-muted/80'
  }`;

const Divider = () => <span aria-hidden="true" className="h-6 w-px shrink-0 bg-border mx-1" />;

const SIZES: { value: GroupSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

/**
 * The home feed's one filter bar. It pins under the header while you scroll and
 * drives every section below it.
 */
const HomeFilterBar = ({ value, onChange, profileInterests, onSaveInterests, interestsRef, inclusivityRef }: Props) => {
  const set = (patch: Partial<FeedFilters>) => onChange({ ...value, ...patch });
  const toggleInterest = (id: string) =>
    set({ interests: value.interests.includes(id) ? value.interests.filter(i => i !== id) : [...value.interests, id] });
  const toggleSize = (s: GroupSize) =>
    set({ size: value.size.includes(s) ? value.size.filter(x => x !== s) : [...value.size, s] });

  // Interests picked from "More" that the user doesn't follow show as chips while selected.
  const extras = value.interests.filter(id => !profileInterests.includes(id));
  const rowInterests = [...profileInterests, ...extras];

  const [moreOpen, setMoreOpen] = useState(false);

  // A zero-height marker above the bar: once it scrolls under the header, the bar is pinned.
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setPinned(!entry.isIntersecting), {
      rootMargin: '-65px 0px 0px 0px',
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" />
      <div
        className={`sticky top-16 z-40 border-b transition-colors ${
          pinned ? 'bg-card/95 backdrop-blur-lg border-border' : 'bg-background border-transparent'
        }`}
      >
        <div className="container px-4 md:px-6">
          <div
            role="toolbar"
            aria-label="Filter your feed"
            className="flex items-center gap-2 overflow-x-auto py-3 pr-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,black_calc(100%-48px),transparent)]"
          >
            <div ref={interestsRef} className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className={chip(value.interests.length === 0)}
                aria-pressed={value.interests.length === 0}
                onClick={() => set({ interests: [] })}
              >
                All
              </button>
              {rowInterests.map(id => (
                <button
                  key={id}
                  type="button"
                  className={chip(value.interests.includes(id))}
                  aria-pressed={value.interests.includes(id)}
                  onClick={() => toggleInterest(id)}
                >
                  {interestLabel(id)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                aria-haspopup="dialog"
                className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 min-h-9 px-3.5 rounded-full text-sm font-semibold text-foreground border border-dashed border-muted-foreground/60 hover:bg-muted/60 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                More
              </button>
            </div>

            <Divider />

            <button
              type="button"
              className={chip(value.time === 'week')}
              aria-pressed={value.time === 'week'}
              onClick={() => set({ time: value.time === 'week' ? 'any' : 'week' })}
            >
              This week
            </button>
            <button
              type="button"
              className={chip(value.time === 'month')}
              aria-pressed={value.time === 'month'}
              onClick={() => set({ time: value.time === 'month' ? 'any' : 'month' })}
            >
              This month
            </button>

            <Divider />

            {SIZES.map(s => (
              <button
                key={s.value}
                type="button"
                className={chip(value.size.includes(s.value))}
                aria-pressed={value.size.includes(s.value)}
                onClick={() => toggleSize(s.value)}
              >
                {s.label}
              </button>
            ))}

            <Divider />

            <div ref={inclusivityRef} className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className={chip(value.womenOnly)}
                aria-pressed={value.womenOnly}
                onClick={() => set({ womenOnly: !value.womenOnly })}
              >
                Women only
              </button>
              <button
                type="button"
                className={chip(value.lgbtqFriendly)}
                aria-pressed={value.lgbtqFriendly}
                onClick={() => set({ lgbtqFriendly: !value.lgbtqFriendly })}
              >
                LGBTQ+ friendly
              </button>
              <button
                type="button"
                className={chip(value.petFriendly)}
                aria-pressed={value.petFriendly}
                onClick={() => set({ petFriendly: !value.petFriendly })}
              >
                Pet friendly
              </button>
            </div>

            {activeFilterCount(value) >= 2 && (
              <button
                type="button"
                onClick={() => onChange(DEFAULT_FEED_FILTERS)}
                className="shrink-0 whitespace-nowrap min-h-9 px-2 ml-1 text-sm font-semibold text-primary underline-offset-2 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Browse all interests</DialogTitle>
            <DialogDescription>
              Pick any to filter your feed. Your own interests are marked with a check.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2 py-2">
            {ONBOARDING_INTERESTS.map(i => {
              const on = value.interests.includes(i.id);
              return (
                <button
                  key={i.id}
                  type="button"
                  className={chip(on)}
                  aria-pressed={on}
                  onClick={() => toggleInterest(i.id)}
                >
                  {profileInterests.includes(i.id) && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                  {i.label}
                </button>
              );
            })}
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            {extras.length > 0 ? (
              <Button
                variant="outline"
                onClick={() => {
                  onSaveInterests(extras);
                  setMoreOpen(false);
                }}
              >
                {extras.length === 1
                  ? `Save ${interestLabel(extras[0])} to my interests`
                  : `Save ${extras.length} to my interests`}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Change your saved interests anytime in your profile.</p>
            )}
            <Button onClick={() => setMoreOpen(false)}>Show results</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HomeFilterBar;
