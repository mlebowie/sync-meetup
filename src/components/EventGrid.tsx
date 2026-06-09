import { Event, FilterState, Participant } from '@/types/event';
import EventCard from './EventCard';
import { useMemo } from 'react';

interface EventGridProps {
  events: Event[];
  filters: FilterState;
  onAttend: (eventId: string) => void;
  onParticipantClick?: (participant: Participant) => void;
  onOpenGroupChat?: (event: Event) => void;
}

const EventGrid = ({ events, filters, onAttend, onParticipantClick, onOpenGroupChat }: EventGridProps) => {
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Filter by activity level
      if (filters.activityLevel.length > 0 && 
          !filters.activityLevel.includes(event.activityLevel)) {
        return false;
      }

      // Filter by intensity
      if (filters.intensity.length > 0 && 
          !filters.intensity.includes(event.intensity)) {
        return false;
      }

      // Filter by group size
      if (filters.groupSize.length > 0 && 
          !filters.groupSize.includes(event.groupSize)) {
        return false;
      }

      // Filter by location
      if (filters.location.length > 0 && 
          !filters.location.some(loc => event.location.toLowerCase().includes(loc.toLowerCase()))) {
        return false;
      }

      // Filter by interests (match any interest/tag)
      if (filters.interests.length > 0) {
        const interestLabels = filters.interests.map(id => {
          const interestMap: Record<string, string[]> = {
            '1': ['fitness', 'sports', 'running'],
            '2': ['networking', 'founders', 'tech'],
            '3': ['arts', 'creative', 'photography'],
            '4': ['outdoors', 'trails', 'nature'],
            '5': ['food', 'drinks', 'dinner'],
            '6': ['music', 'dancing', 'salsa'],
            '7': ['languages', 'culture', 'learning'],
            '8': ['tech', 'founders', 'startup'],
            '9': ['wellness', 'yoga', 'mindfulness'],
            '10': ['photography', 'creative'],
            '11': ['travel', 'adventure'],
            '12': ['games', 'gaming'],
          };
          return interestMap[id] || [];
        }).flat();

        const hasMatchingInterest = event.tags.some(tag => 
          interestLabels.some(interest => 
            tag.toLowerCase().includes(interest.toLowerCase())
          )
        );

        if (!hasMatchingInterest) {
          return false;
        }
      }

      return true;
    });
  }, [events, filters]);

  if (filteredEvents.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          No events found
        </h3>
        <p className="text-muted-foreground">
          Try adjusting your filters or interests to discover more events
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredEvents.map((event, index) => (
        <div
          key={event.id}
          className="animate-fade-in-up"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <EventCard event={event} onAttend={onAttend} />
        </div>
      ))}
    </div>
  );
};

export default EventGrid;
