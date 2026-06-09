import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { interests } from '@/data/mockData';
import { FilterState, ActivityLevel, Intensity, GroupSize } from '@/types/event';
import { Sparkles } from 'lucide-react';

interface IntakeFormProps {
  onSubmit: (filters: FilterState, interestIds: string[]) => void;
}

const activityLevels: { value: ActivityLevel; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
];

const intensities: { value: Intensity; label: string }[] = [
  { value: 'chill', label: 'Chill' },
  { value: 'social', label: 'Social' },
  { value: 'energetic', label: 'Energetic' },
];

const groupSizeMap: GroupSize[] = ['small', 'medium', 'large'];
const groupSizeLabels = ['Small (2-12)', 'Medium (12-25)', 'Large (25+)'];

const distanceOptions = ['Walking (< 1km)', 'Nearby (1-3km)', 'Across town (3-10km)', 'Anywhere (10km+)'];

const IntakeForm = ({ onSubmit }: IntakeFormProps) => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [neighborhood, setNeighborhood] = useState('');
  const [distance, setDistance] = useState('');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel[]>([]);
  const [intensity, setIntensity] = useState<Intensity[]>([]);
  const [groupSizeIdx, setGroupSizeIdx] = useState<number[]>([1]);

  const toggle = <T,>(arr: T[], val: T, setter: (v: T[]) => void) => {
    setter(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
  };

  const toggleInterest = (id: string) =>
    toggle(selectedInterests, id, setSelectedInterests);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(
      {
        activityLevel,
        intensity,
        groupSize: [groupSizeMap[groupSizeIdx[0]]],
        interests: selectedInterests,
        location: [],
      },
      selectedInterests
    );
    document.getElementById('events')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="intake" className="py-12 md:py-16 bg-secondary/30">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-display font-light text-foreground mb-2">
            Personalize your experience
          </h2>
          <p className="text-muted-foreground">
            Tell us a bit about you and we'll curate events you'll love
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto bg-card rounded-2xl shadow-card p-6 md:p-8 space-y-8"
        >
          {/* Interests */}
          <div>
            <Label className="text-sm font-semibold text-foreground mb-3 block">
              What are you interested in?
            </Label>
            <div className="flex flex-wrap gap-2">
              {interests.map(interest => (
                <Button
                  key={interest.id}
                  type="button"
                  variant={selectedInterests.includes(interest.id) ? 'tagActive' : 'tag'}
                  size="tag"
                  onClick={() => toggleInterest(interest.id)}
                >
                  <span className="mr-1">{interest.icon}</span>
                  {interest.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Neighborhood + Distance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="neighborhood" className="text-sm font-semibold text-foreground mb-3 block">
                Your neighborhood
              </Label>
              <Input
                id="neighborhood"
                placeholder="e.g. Ribeira, Cedofeita"
                value={neighborhood}
                onChange={e => setNeighborhood(e.target.value.slice(0, 80))}
                maxLength={80}
              />
            </div>
            <div>
              <Label className="text-sm font-semibold text-foreground mb-3 block">
                Distance from event
              </Label>
              <Select value={distance} onValueChange={setDistance}>
                <SelectTrigger>
                  <SelectValue placeholder="How far will you go?" />
                </SelectTrigger>
                <SelectContent>
                  {distanceOptions.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Activity Level */}
          <div>
            <Label className="text-sm font-semibold text-foreground mb-3 block">
              Preferred activity level
            </Label>
            <div className="flex flex-wrap gap-2">
              {activityLevels.map(({ value, label }) => (
                <Button
                  key={value}
                  type="button"
                  variant={activityLevel.includes(value) ? 'tagActive' : 'tag'}
                  size="tag"
                  onClick={() => toggle(activityLevel, value, setActivityLevel)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Intensity */}
          <div>
            <Label className="text-sm font-semibold text-foreground mb-3 block">
              Preferred intensity
            </Label>
            <div className="flex flex-wrap gap-2">
              {intensities.map(({ value, label }) => (
                <Button
                  key={value}
                  type="button"
                  variant={intensity.includes(value) ? 'tagActive' : 'tag'}
                  size="tag"
                  onClick={() => toggle(intensity, value, setIntensity)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Group Size Slider */}
          <div>
            <Label className="text-sm font-semibold text-foreground mb-3 block">
              Preferred group size: <span className="text-primary font-normal">{groupSizeLabels[groupSizeIdx[0]]}</span>
            </Label>
            <Slider
              value={groupSizeIdx}
              onValueChange={setGroupSizeIdx}
              min={0}
              max={2}
              step={1}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>Small</span>
              <span>Medium</span>
              <span>Large</span>
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <Button type="submit" variant="hero" size="lg">
              <Sparkles className="h-4 w-4 mr-2" />
              View recommendations
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default IntakeForm;
