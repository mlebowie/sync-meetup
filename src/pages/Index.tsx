import { useState } from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import InterestSelector from '@/components/InterestSelector';
import EventFilters from '@/components/EventFilters';
import EventGrid from '@/components/EventGrid';
import { mockEvents } from '@/data/mockData';
import { FilterState, Event } from '@/types/event';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const { toast } = useToast();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    activityLevel: [],
    intensity: [],
    groupSize: [],
    interests: [],
  });
  const [events, setEvents] = useState<Event[]>(mockEvents);

  const handleInterestsChange = (interests: string[]) => {
    setSelectedInterests(interests);
    setFilters(prev => ({ ...prev, interests }));
  };

  const handleAttend = (eventId: string) => {
    setEvents(prev => prev.map(event => 
      event.id === eventId 
        ? { ...event, isAttending: !event.isAttending }
        : event
    ));

    const event = events.find(e => e.id === eventId);
    if (event) {
      const isNowAttending = !event.isAttending;
      toast({
        title: isNowAttending ? "You're in! 🎉" : "Event removed",
        description: isNowAttending 
          ? `You're now attending "${event.title}". Connect with other attendees!`
          : `You've removed "${event.title}" from your events.`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <InterestSelector 
        selectedInterests={selectedInterests}
        onInterestsChange={handleInterestsChange}
      />
      
      <section id="events" className="py-12 md:py-16">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Upcoming Events
            </h2>
            <p className="text-muted-foreground">
              Discover events tailored to your preferences
            </p>
          </div>

          <EventFilters filters={filters} onFiltersChange={setFilters} />
          <EventGrid 
            events={events} 
            filters={filters} 
            onAttend={handleAttend}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary/50 py-8 mt-12">
        <div className="container px-4 md:px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold text-foreground">Sync</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Find your people. Sync your life.
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            © 2024 Sync. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
