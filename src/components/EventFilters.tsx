import { Button } from '@/components/ui/button';
import { FilterState, ActivityLevel, Intensity, GroupSize } from '@/types/event';
import { Zap, Users, Activity, MapPin, Heart } from 'lucide-react';

interface EventFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

const activityLevels: { value: ActivityLevel; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-activity-low' },
  { value: 'moderate', label: 'Moderate', color: 'bg-activity-moderate' },
  { value: 'high', label: 'High', color: 'bg-activity-high' },
];

const intensities: { value: Intensity; label: string; color: string }[] = [
  { value: 'chill', label: 'Chill', color: 'bg-intensity-chill' },
  { value: 'social', label: 'Social', color: 'bg-intensity-social' },
  { value: 'energetic', label: 'Energetic', color: 'bg-intensity-energetic' },
];

const groupSizes: { value: GroupSize; label: string; range: string }[] = [
  { value: 'small', label: 'Small', range: '2-12' },
  { value: 'medium', label: 'Medium', range: '12-25' },
  { value: 'large', label: 'Large', range: '25+' },
];

const locations: { value: string; label: string }[] = [
  { value: 'Porto', label: 'Porto, Portugal' },
];

const EventFilters = ({ filters, onFiltersChange }: EventFiltersProps) => {
  const toggleActivityLevel = (value: ActivityLevel) => {
    const newValues = filters.activityLevel.includes(value)
      ? filters.activityLevel.filter(v => v !== value)
      : [...filters.activityLevel, value];
    onFiltersChange({ ...filters, activityLevel: newValues });
  };

  const toggleIntensity = (value: Intensity) => {
    const newValues = filters.intensity.includes(value)
      ? filters.intensity.filter(v => v !== value)
      : [...filters.intensity, value];
    onFiltersChange({ ...filters, intensity: newValues });
  };

  const toggleGroupSize = (value: GroupSize) => {
    const newValues = filters.groupSize.includes(value)
      ? filters.groupSize.filter(v => v !== value)
      : [...filters.groupSize, value];
    onFiltersChange({ ...filters, groupSize: newValues });
  };

  const toggleLocation = (value: string) => {
    const newValues = filters.location.includes(value)
      ? filters.location.filter(v => v !== value)
      : [...filters.location, value];
    onFiltersChange({ ...filters, location: newValues });
  };

  const toggleFollowFriends = () => {
    onFiltersChange({ ...filters, followFriends: !filters.followFriends });
  };

  return (
    <div className="bg-card rounded-2xl shadow-card p-5">
      <div className="grid grid-cols-1 gap-5">
        {/* Activity Level */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Activity Level</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {activityLevels.map(({ value, label, color }) => (
              <button
                key={value}
                onClick={() => toggleActivityLevel(value)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filters.activityLevel.includes(value)
                    ? 'bg-primary text-primary-foreground shadow-button'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${color}`} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Intensity */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-foreground">Intensity</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {intensities.map(({ value, label, color }) => (
              <button
                key={value}
                onClick={() => toggleIntensity(value)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filters.intensity.includes(value)
                    ? 'bg-primary text-primary-foreground shadow-button'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${color}`} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Group Size */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-success" />
            <span className="text-sm font-semibold text-foreground">Group Size</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {groupSizes.map(({ value, label, range }) => (
              <button
                key={value}
                onClick={() => toggleGroupSize(value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filters.groupSize.includes(value)
                    ? 'bg-primary text-primary-foreground shadow-button'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {label} ({range})
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-danger" />
            <span className="text-sm font-semibold text-foreground">Location</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {locations.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => toggleLocation(value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filters.location.includes(value)
                    ? 'bg-primary text-primary-foreground shadow-button'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Follow my friends */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Heart className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-foreground">Social</span>
          </div>
          <button
            onClick={toggleFollowFriends}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              filters.followFriends
                ? 'bg-primary text-primary-foreground shadow-button'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${filters.followFriends ? 'fill-current' : ''}`} />
            Follow my friends
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventFilters;
