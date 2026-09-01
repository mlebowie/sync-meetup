import { useEffect, useMemo, useRef, useState } from 'react';
import { Event, Participant, ActivityLevel, Intensity, GroupSize } from '@/types/event';
import { CITY_NEIGHBORHOODS } from '@/lib/onboardingData';
import { ONBOARDING_INTERESTS, getInterestKeywords, UserProfile } from '@/lib/userProfile';
import ExpandableEventGrid from './ExpandableEventGrid';
import FilterTour, { TourStep } from './FilterTour';
import { START_FILTER_TOUR_EVENT, setFilterTourState } from '@/lib/filterTour';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TypeaheadSelect } from './TypeaheadSelect';
import { Clock, MapPin, Users, Activity, Zap, Ruler, Sparkles, CalendarRange, Heart, HelpCircle } from 'lucide-react';

interface Props {
  events: Event[];
  profile: UserProfile;
  onAttend: (id: string) => void;
  onParticipantClick?: (p: Participant) => void;
  onOpenGroupChat?: (e: Event) => void;
}

type TimeWindow = 'hour' | '6h' | 'day' | 'week' | 'any';

const eventAvgAge = (id: string) => {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 22 + (h % 25); // 22-46
};
const eventDistance = (id: string) => {
  let h = 0;
  for (const c of id) h = (h * 17 + c.charCodeAt(0)) >>> 0;
  return 0.5 + ((h % 90) / 10);
};

const timeWindows: { value: TimeWindow; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: 'hour', label: 'Next hour' },
  { value: '6h', label: 'Next 6 hours' },
  { value: 'day', label: 'Next day' },
  { value: 'week', label: 'Next week' },
];

const activityLevels: ActivityLevel[] = ['low', 'moderate', 'high'];
const intensities: Intensity[] = ['chill', 'social', 'energetic'];

// Group size slider: 0=Any, 1=Small, 2=Medium, 3=Large
const groupSizeStops: { value: 0 | 1 | 2 | 3; label: string; size: GroupSize | null }[] = [
  { value: 0, label: 'Any', size: null },
  { value: 1, label: 'Small (2–12)', size: 'small' },
  { value: 2, label: 'Medium (12–25)', size: 'medium' },
  { value: 3, label: 'Large (25+)', size: 'large' },
];

const UpcomingEventsSection = ({ events, profile, onAttend, onParticipantClick, onOpenGroupChat }: Props) => {
  const neighborhoods = CITY_NEIGHBORHOODS[profile.location] ?? CITY_NEIGHBORHOODS['Porto'];

  const [timeWindow, setTimeWindow] = useState<TimeWindow>('any');
  const [neighborhood, setNeighborhood] = useState<string>('');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel[]>([]);
  const [intensity, setIntensity] = useState<Intensity[]>([]);
  const [groupSizeIdx, setGroupSizeIdx] = useState<number>(0);
  const [ageRange, setAgeRange] = useState<[number, number]>([22, 45]);
  const [maxDistance, setMaxDistance] = useState<number>(15);
  const [interests, setInterests] = useState<string[]>(profile.interests ?? []);
  const [recommendMode, setRecommendMode] = useState(false);
  const [womenOnly, setWomenOnly] = useState(false);
  const [lgbtqFriendly, setLgbtqFriendly] = useState(false);
  const [petFriendly, setPetFriendly] = useState(false);

  // --- First-run tutorial ---------------------------------------------------
  const interestsRef = useRef<HTMLDivElement>(null);
  const vibeRef = useRef<HTMLDivElement>(null);
  const placeRef = useRef<HTMLDivElement>(null);
  const inclusivityRef = useRef<HTMLDivElement>(null);
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    const start = () => setTourOpen(true);
    window.addEventListener(START_FILTER_TOUR_EVENT, start);
    return () => window.removeEventListener(START_FILTER_TOUR_EVENT, start);
  }, []);

  const tourSteps: TourStep[] = [
    {
      title: 'Interests come from your profile',
      body: 'These are pre-selected from onboarding, so your feed already matches you. Add or remove any of them here — and use the Time dropdown above when you only want what starts soon.',
      ref: interestsRef,
    },
    {
      title: 'Choose how the room should feel',
      body: 'Group size, activity level and intensity set the vibe. Chill coffee for 6, or a high-energy group run for 30 — pick what you actually want to walk into.',
      ref: vibeRef,
    },
    {
      title: 'Keep it close to home',
      body: `We show events closest to your neighborhood first. Tighten the radius for things you can walk to, and set the age range of who you'll meet.`,
      ref: placeRef,
    },
    {
      title: 'Only show spaces that fit you',
      body: 'Women only, LGBTQ+ friendly and pet friendly narrow the feed to events built with those in mind. That\u2019s it — change any of this any time and your feed updates instantly.',
      ref: inclusivityRef,
    },
  ];

  const resetFilters = () => {
    setTimeWindow('any'); setNeighborhood(''); setActivityLevel([]); setIntensity([]);
    setGroupSizeIdx(0); setAgeRange([22, 45]); setMaxDistance(15);
    setInterests(profile.interests ?? []); setRecommendMode(false);
    setWomenOnly(false); setLgbtqFriendly(false); setPetFriendly(false);
  };


  const toggle = <T,>(value: T, list: T[], setter: (v: T[]) => void) => {
    setter(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  };

  const neighborhoodOptions = useMemo(
    () => neighborhoods.map(n => ({ value: n, label: n, searchText: n })),
    [neighborhoods]
  );

  const filtered = useMemo(() => {
    const now = Date.now();
    const windowMs: Record<TimeWindow, number> = {
      hour: 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      any: Infinity,
    };

    const activeInterests = recommendMode && interests.length === 0 ? profile.interests : interests;
    const keywords = getInterestKeywords(activeInterests).map(k => k.toLowerCase());
    const selectedSize = groupSizeStops[groupSizeIdx]?.size ?? null;
    const nbq = neighborhood.trim().toLowerCase();

    const list = events.filter(e => {
      const diff = e.date.getTime() - now;
      if (windowMs[timeWindow] !== Infinity && (diff < 0 || diff > windowMs[timeWindow])) return false;
      if (nbq && !e.location.toLowerCase().includes(nbq)) return false;
      if (activityLevel.length > 0 && !activityLevel.includes(e.activityLevel)) return false;
      if (intensity.length > 0 && !intensity.includes(e.intensity)) return false;
      if (selectedSize && e.groupSize !== selectedSize) return false;
      const age = eventAvgAge(e.id);
      if (age < ageRange[0] || age > ageRange[1]) return false;
      if (eventDistance(e.id) > maxDistance) return false;
      if (keywords.length > 0) {
        const blob = [e.category, ...e.tags].join(' ').toLowerCase();
        if (!keywords.some(k => blob.includes(k))) return false;
      }
      if (womenOnly && !e.womenOnly) return false;
      if (lgbtqFriendly && !e.lgbtqFriendly) return false;
      if (petFriendly && !e.petFriendly) return false;
      return true;
    });

    // Closest to the chosen neighborhood first.
    return [...list].sort((a, b) => eventDistance(a.id) - eventDistance(b.id));
  }, [events, timeWindow, neighborhood, activityLevel, intensity, groupSizeIdx, ageRange, maxDistance, interests, recommendMode, profile.interests, womenOnly, lgbtqFriendly, petFriendly]);

  const pill = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
      active ? 'bg-primary text-primary-foreground shadow-button' : 'bg-muted text-muted-foreground hover:bg-muted/80'
    }`;

  return (
    <section id="upcoming" className="py-12 md:py-16">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Upcoming events</h2>
          <p className="text-muted-foreground">Dial in exactly what you want to walk into</p>
        </div>

        <div className="bg-card rounded-2xl shadow-card p-5 md:p-6 mb-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Time dropdown */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Time</span>
              </div>
              <Select value={timeWindow} onValueChange={(v) => setTimeWindow(v as TimeWindow)}>
                <SelectTrigger>
                  <SelectValue placeholder="Any time" />
                </SelectTrigger>
                <SelectContent>
                  {timeWindows.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Neighborhood typeahead */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-danger" />
                <span className="text-sm font-semibold">Neighborhood</span>
              </div>
              <TypeaheadSelect
                value={neighborhood}
                onChange={setNeighborhood}
                options={neighborhoodOptions}
                placeholder="Type to filter (e.g. Cedofeita)"
                allowFreeText
              />
            </div>
          </div>

          {/* Group size slider */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-success" />
                <span className="text-sm font-semibold">Preferred group size</span>
              </div>
              <span className="text-sm text-muted-foreground">{groupSizeStops[groupSizeIdx].label}</span>
            </div>
            <Slider
              min={0}
              max={3}
              step={1}
              value={[groupSizeIdx]}
              onValueChange={v => setGroupSizeIdx(v[0])}
            />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              {groupSizeStops.map(s => <span key={s.value}>{s.label.split(' ')[0]}</span>)}
            </div>
          </div>

          {/* Activity level */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Preferred activity level</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {activityLevels.map(a => (
                <button key={a} onClick={() => toggle(a, activityLevel, setActivityLevel)} className={pill(activityLevel.includes(a))}>
                  {a.charAt(0).toUpperCase() + a.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Intensity */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-accent-strong" />
              <span className="text-sm font-semibold">Preferred intensity</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {intensities.map(i => (
                <button key={i} onClick={() => toggle(i, intensity, setIntensity)} className={pill(intensity.includes(i))}>
                  {i.charAt(0).toUpperCase() + i.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Age range — two handles */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CalendarRange className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Age range of attendees</span>
              </div>
              <span className="text-sm text-muted-foreground">{ageRange[0]}–{ageRange[1]} years old</span>
            </div>
            <Slider
              min={18}
              max={65}
              step={1}
              minStepsBetweenThumbs={1}
              value={ageRange}
              onValueChange={v => setAgeRange([v[0], v[1]] as [number, number])}
            />
          </div>

          {/* Distance */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-success" />
                <span className="text-sm font-semibold">Distance from event</span>
              </div>
              <span className="text-sm text-muted-foreground">≤ {maxDistance.toFixed(1)} km</span>
            </div>
            <Slider
              min={1}
              max={20}
              step={0.5}
              value={[maxDistance]}
              onValueChange={v => setMaxDistance(v[0])}
            />
          </div>

          {/* Interests */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-accent-strong" />
              <span className="text-sm font-semibold">Interests</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {ONBOARDING_INTERESTS.map(i => (
                <button key={i.id} onClick={() => toggle(i.id, interests, setInterests)} className={pill(interests.includes(i.id))}>
                  <span className="mr-1">{i.icon}</span>{i.label}
                </button>
              ))}
            </div>
          </div>

          {/* Inclusivity */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Heart className="h-4 w-4 text-danger" />
              <span className="text-sm font-semibold">Inclusivity</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setWomenOnly(v => !v)} className={pill(womenOnly)}>
                Women only
              </button>
              <button onClick={() => setLgbtqFriendly(v => !v)} className={pill(lgbtqFriendly)}>
                LGBTQ+ friendly
              </button>
              <button onClick={() => setPetFriendly(v => !v)} className={pill(petFriendly)}>
                Pet friendly
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-border">
            <Button variant="ghost" onClick={() => {
              setTimeWindow('any'); setNeighborhood(''); setActivityLevel([]); setIntensity([]);
              setGroupSizeIdx(0); setAgeRange([22, 45]); setMaxDistance(15); setInterests(profile.interests ?? []); setRecommendMode(false);
              setWomenOnly(false); setLgbtqFriendly(false); setPetFriendly(false);
            }}>
              Reset filters
            </Button>
            <Button variant="hero" onClick={() => setRecommendMode(true)}>
              <Sparkles className="h-4 w-4 mr-1.5" />
              View recommendations
            </Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">No matches yet</h3>
            <p className="text-muted-foreground">Loosen a filter and try again.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">{filtered.length} event{filtered.length === 1 ? '' : 's'} match your filters</p>
            <ExpandableEventGrid
              events={filtered}
              onAttend={onAttend}
              onParticipantClick={onParticipantClick}
              onOpenGroupChat={onOpenGroupChat}
            />
          </>

        )}
      </div>
    </section>
  );
};

export default UpcomingEventsSection;
