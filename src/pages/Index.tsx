import { useState } from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import InterestSelector from '@/components/InterestSelector';
import IntakeForm from '@/components/IntakeForm';
import EventFilters from '@/components/EventFilters';
import EventGrid from '@/components/EventGrid';
import ParticipantProfileDialog from '@/components/ParticipantProfileDialog';
import EventGroupChatDialog from '@/components/EventGroupChatDialog';
import DirectMessagesDialog from '@/components/DirectMessagesDialog';
import { mockEvents } from '@/data/mockData';
import { FilterState, Event, Participant } from '@/types/event';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

const Index = () => {
  const { toast } = useToast();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    activityLevel: [],
    intensity: [],
    groupSize: [],
    interests: [],
    location: [],
  });
  const [events, setEvents] = useState<Event[]>(mockEvents);

  const [profileParticipant, setProfileParticipant] = useState<Participant | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [groupChatEvent, setGroupChatEvent] = useState<Event | null>(null);
  const [groupChatOpen, setGroupChatOpen] = useState(false);
  const [dmOpen, setDmOpen] = useState(false);
  const [dmInitialId, setDmInitialId] = useState<string | null>(null);

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
          ? `You're attending "${event.title}". The group chat is open — meet attendees before the event!`
          : `You've removed "${event.title}" from your events.`,
      });
    }
  };

  const handleParticipantClick = (p: Participant) => {
    setProfileParticipant(p);
    setProfileOpen(true);
  };

  const handleOpenGroupChat = (event: Event) => {
    setGroupChatEvent(event);
    setGroupChatOpen(true);
  };

  const handleOpenDM = (participantId: string) => {
    setDmInitialId(participantId);
    setDmOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onOpenMessages={() => { setDmInitialId(null); setDmOpen(true); }} />
      <Hero />
      <InterestSelector
        selectedInterests={selectedInterests}
        onInterestsChange={handleInterestsChange}
      />
      <IntakeForm
        onSubmit={(newFilters, interestIds) => {
          setSelectedInterests(interestIds);
          setFilters(prev => ({ ...prev, ...newFilters }));
        }}
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
            onParticipantClick={handleParticipantClick}
            onOpenGroupChat={handleOpenGroupChat}
          />
        </div>
      </section>

      {/* Floating messages button */}
      <Button
        variant="hero"
        size="icon"
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-40"
        onClick={() => { setDmInitialId(null); setDmOpen(true); }}
        title="Direct messages"
      >
        <MessageCircle className="h-5 w-5" />
      </Button>

      <ParticipantProfileDialog
        participant={profileParticipant}
        open={profileOpen}
        onOpenChange={setProfileOpen}
        onOpenDM={handleOpenDM}
      />
      <EventGroupChatDialog
        event={groupChatEvent}
        open={groupChatOpen}
        onOpenChange={setGroupChatOpen}
      />
      <DirectMessagesDialog
        open={dmOpen}
        onOpenChange={setDmOpen}
        initialPartnerId={dmInitialId}
      />

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
