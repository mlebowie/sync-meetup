import { useMemo, useState } from 'react';
import { useEvents } from '@/context/EventsContext';
import { getInterestKeywords, UserProfile } from '@/lib/userProfile';
import { Event, GroupSize, Participant } from '@/types/event';
import ExpandableEventGrid from './ExpandableEventGrid';
import { Button } from '@/components/ui/button';
import { Sparkles, Clock, MapPin, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


type TimeWindow = 'hour' | '6h' | 'day';

interface Props {
  profile: UserProfile;
  onAttend: (id: string) => void;
  onParticipantClick?: (p: Participant) => void;
  onOpenGroupChat?: (e: Event) => void;
}

const WINDOWS: { value: TimeWindow; label: string; ms: number }[] = [
  { value: 'hour', label: 'Next hour', ms: 60 * 60 * 1000 },
  { value: '6h', label: 'Next 6 hours', ms: 6 * 60 * 60 * 1000 },
  { value: 'day', label: 'Next day', ms: 24 * 60 * 60 * 1000 },
];

// Re-anchor mock event dates so the "happening soon" demo is meaningful.
const SOON_OFFSETS = [20, 90, 240, 600, 1200, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100].map(m => m * 60 * 1000);

const socialStyleScore = (event: Event, profile: UserProfile): number => {
  switch (profile.socialStyle) {
    case 'weekend-explorer':
      return (event.intensity === 'energetic' ? 4 : 0) + (event.groupSize !== 'small' ? 2 : 0) + (event.recurrence === 'one-off' ? 1 : 0);
    case 'community-builder':
      return (event.recurrence && event.recurrence !== 'one-off' ? 4 : 0) + (event.intensity === 'social' ? 2 : 0);
    case 'selective-socialiser':
      return (event.groupSize === 'small' ? 4 : 0) + (event.intensity === 'chill' ? 2 : 0);
    case 'new-in-town-nomad':
      return (event.intensity === 'social' ? 3 : 0) + (event.groupSize === 'medium' ? 2 : 0) + (event.category.toLowerCase().includes('social') ? 2 : 0);
    default:
      return 0;
  }
};


const PersonalizedFeed = ({ profile, onAttend, onParticipantClick, onOpenGroupChat }: Props) => {
  const { events: mockEvents } = useEvents();
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('day');
  const [groupSize, setGroupSize] = useState<'all' | GroupSize>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');

  const personalized: Event[] = useMemo(() => {
    const keywords = getInterestKeywords(profile.interests).map(k => k.toLowerCase());
    const matches = mockEvents.filter(e => {
      const blob = [e.category, ...e.tags].join(' ').toLowerCase();
      return keywords.some(k => blob.includes(k));
    });
    const pool = [...matches].sort((a, b) => socialStyleScore(b, profile) - socialStyleScore(a, profile));
    const now = Date.now();
    return pool.slice(0, 13).map((e, i) => ({
      ...e,
      date: new Date(now + SOON_OFFSETS[i % SOON_OFFSETS.length]),
    }));

  }, [mockEvents, profile]);

  const locations = useMemo(
    () => Array.from(new Set(personalized.map(e => e.location.split(',').pop()?.trim() || e.location))),
    [personalized],
  );

  const filtered = useMemo(() => {
    const now = Date.now();
    const windowMs = WINDOWS.find(w => w.value === timeWindow)!.ms;
    return personalized.filter(e => {
      if (e.date.getTime() - now > windowMs) return false;
      if (groupSize !== 'all' && e.groupSize !== groupSize) return false;
      if (locationFilter !== 'all' && !e.location.toLowerCase().includes(locationFilter.toLowerCase())) return false;
      return true;
    });
  }, [personalized, timeWindow, groupSize, locationFilter]);

  return (
    <section className="py-10 md:py-14">
      <div className="container px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-primary font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5" /> For you
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
            Happening soon, picked for you
          </h2>
          <p className="text-muted-foreground mb-6">
            Events matched to your interests and starting within your selected window.
          </p>


          <div className="flex flex-wrap items-end gap-3 mb-6 bg-card rounded-xl p-4 shadow-card">
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                <Clock className="h-3 w-3" /> Time
              </label>
              <Select value={timeWindow} onValueChange={v => setTimeWindow(v as TimeWindow)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WINDOWS.map(w => (
                    <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                <MapPin className="h-3 w-3" /> Location
              </label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {locations.map(l => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                <Users className="h-3 w-3" /> Group size
              </label>
              <Select value={groupSize} onValueChange={v => setGroupSize(v as 'all' | GroupSize)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any size</SelectItem>
                  <SelectItem value="small">Small (2-12)</SelectItem>
                  <SelectItem value="medium">Medium (12-25)</SelectItem>
                  <SelectItem value="large">Large (25+)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl shadow-card">
              <div className="text-4xl mb-3">🔍</div>
              <h3 className="font-semibold text-foreground">Nothing in that window</h3>
              <p className="text-sm text-muted-foreground">Try widening the time or clearing filters.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => { setTimeWindow('day'); setGroupSize('all'); setLocationFilter('all'); }}>
                Reset filters
              </Button>
            </div>
          ) : (
            <ExpandableEventGrid
              events={filtered}
              onAttend={onAttend}
              onParticipantClick={onParticipantClick}
              onOpenGroupChat={onOpenGroupChat}
            />

          )}
        </div>
      </div>
    </section>
  );
};

export default PersonalizedFeed;
