import { useMemo, useState } from 'react';
import { Event, Participant, ActivityLevel, Intensity, GroupSize } from '@/types/event';
import { CITY_NEIGHBORHOODS } from '@/lib/onboardingData';
import { ONBOARDING_INTERESTS, getInterestKeywords, UserProfile } from '@/lib/userProfile';
import EventCard from './EventCard';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Clock, MapPin, Users, Activity, Zap, Ruler, Sparkles, CalendarRange } from 'lucide-react';

interface Props {
  events: Event[];
  profile: UserProfile;
  onAttend: (id: string) => void;
  onParticipantClick?: (p: Participant) => void;
  onOpenGroupChat?: (e: Event) => void;
}

type TimeWindow = 'hour' | '6h' | 'day' | 'any';

// Deterministic stub: pseudo avg age 24-46 per event id
const eventAvgAge = (id: string) => {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 24 + (h % 23);
};
// Deterministic stub: distance 0.5 - 9.5 km
const eventDistance = (id: string) => {
  let h = 0;
  for (const c of id) h = (h * 17 + c.charCodeAt(0)) >>> 0;
  return 0.5 + ((h % 90) / 10);
};

const timeWindows: { value: TimeWindow; label: string }[] = [
  { value: 'hour', label: 'Next hour' },
  { value: '6h', label: 'Next 6 hours' },
  { value: 'day', label: 'Next day' },
  { value: 'any', label: 'Any time' },
];

const activityLevels: ActivityLevel[] = ['low', 'moderate', 'high'];
const intensities: Intensity[] = ['chill', 'social', 'energetic'];
const groupSizes: { value: GroupSize; label: string }[] = [
  { value: 'small', label: 'Small (2–12)' },
  { value: 'medium', label: 'Medium (12–25)' },
  { value: 'large', label: 'Large (25+)' },
];

const UpcomingEventsSection = ({ events, profile, onAttend, onParticipantClick, onOpenGroupChat }: Props) => {
  const neighborhoods = CITY_NEIGHBORHOODS[profile.location] ?? CITY_NEIGHBORHOODS['Porto'];

  const [timeWindow, setTimeWindow] = useState<TimeWindow>('any');
  const [neighborhood, setNeighborhood] = useState<string>('any');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel[]>([]);
  const [intensity, setIntensity] = useState<Intensity[]>([]);
  const [groupSize, setGroupSize] = useState<GroupSize[]>([]);
  const [ageRange, setAgeRange] = useState<[number, number]>([22, 50]);
  const [maxDistance, setMaxDistance] = useState<number>(10);
  const [interests, setInterests] = useState<string[]>([]);
  const [recommendMode, setRecommendMode] = useState(false);

  const toggle = <T,>(value: T, list: T[], setter: (v: T[]) => void) => {
    setter(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  };

  const filtered = useMemo(() => {
    const now = Date.now();
    const windowMs: Record<TimeWindow, number> = {
      hour: 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      any: Infinity,
    };

    const activeInterests = recommendMode && interests.length === 0 ? profile.interests : interests;
    const keywords = getInterestKeywords(activeInterests).map(k => k.toLowerCase());

    return events.filter(e => {
      const diff = e.date.getTime() - now;
      if (windowMs[timeWindow] !== Infinity && (diff < 0 || diff > windowMs[timeWindow])) return false;
      if (neighborhood !== 'any' && !e.location.toLowerCase().includes(neighborhood.toLowerCase())) return false;
      if (activityLevel.length > 0 && !activityLevel.includes(e.activityLevel)) return false;
      if (intensity.length > 0 && !intensity.includes(e.intensity)) return false;
      if (groupSize.length > 0 && !groupSize.includes(e.groupSize)) return false;
      const age = eventAvgAge(e.id);
      if (age < ageRange[0] || age > ageRange[1]) return false;
      if (eventDistance(e.id) > maxDistance) return false;
      if (keywords.length > 0) {
        const blob = [e.category, ...e.tags].join(' ').toLowerCase();
        if (!keywords.some(k => blob.includes(k))) return false;
      }
      return true;
    });
  }, [events, timeWindow, neighborhood, activityLevel, intensity, groupSize, ageRange, maxDistance, interests, recommendMode, profile.interests]);

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
          {/* Time window */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Time</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {timeWindows.map(t => (
                <button key={t.value} onClick={() => setTimeWindow(t.value)} className={pill(timeWindow === t.value)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Neighborhood */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-danger" />
              <span className="text-sm font-semibold">Neighborhood</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setNeighborhood('any')} className={pill(neighborhood === 'any')}>Any</button>
              {neighborhoods.map(n => (
                <button key={n} onClick={() => setNeighborhood(n)} className={pill(neighborhood === n)}>{n}</button>
              ))}
            </div>
          </div>

          {/* Group size */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-success" />
              <span className="text-sm font-semibold">Preferred group size</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {groupSizes.map(g => (
                <button key={g.value} onClick={() => toggle(g.value, groupSize, setGroupSize)} className={pill(groupSize.includes(g.value))}>
                  {g.label}
                </button>
              ))}
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
              <Zap className="h-4 w-4 text-accent" />
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

          {/* Age range */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CalendarRange className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Age range of attendees</span>
              </div>
              <span className="text-sm text-muted-foreground">{ageRange[0]}–{ageRange[1]} yrs</span>
            </div>
            <Slider
              min={18}
              max={65}
              step={1}
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
              <Sparkles className="h-4 w-4 text-accent" />
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

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-border">
            <Button variant="ghost" onClick={() => {
              setTimeWindow('any'); setNeighborhood('any'); setActivityLevel([]); setIntensity([]);
              setGroupSize([]); setAgeRange([22, 50]); setMaxDistance(10); setInterests([]); setRecommendMode(false);
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(e => (
              <EventCard
                key={e.id}
                event={e}
                onAttend={onAttend}
                onParticipantClick={onParticipantClick}
                onOpenGroupChat={onOpenGroupChat}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default UpcomingEventsSection;
