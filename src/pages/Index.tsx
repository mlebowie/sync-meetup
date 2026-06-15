import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import IntakeForm from '@/components/IntakeForm';
import EventFilters from '@/components/EventFilters';
import EventGrid from '@/components/EventGrid';
import ParticipantProfileDialog from '@/components/ParticipantProfileDialog';
import EventGroupChatDialog from '@/components/EventGroupChatDialog';
import DirectMessagesDialog from '@/components/DirectMessagesDialog';
import MomentumPanel from '@/components/MomentumPanel';
import ActivityFeed from '@/components/ActivityFeed';
import RecommendedForYou from '@/components/RecommendedForYou';
import GroupsSection from '@/components/GroupsSection';
import PostEventReflectionDialog from '@/components/PostEventReflectionDialog';
import { mockEvents } from '@/data/mockData';
import { getDailyRotatingEvents } from '@/lib/dailyEvents';
import { FilterState, Event, Participant } from '@/types/event';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { MessageCircle, Sparkles } from 'lucide-react';
import { useActivityHistory } from '@/context/ActivityHistoryContext';

const Index = () => {
  const { toast } = useToast();
  const { history } = useActivityHistory();
  const [filters, setFilters] = useState<FilterState>({
    activityLevel: [],
    intensity: [],
    groupSize: [],
    interests: [],
    location: [],
  });
  const [events, setEvents] = useState<Event[]>(() => getDailyRotatingEvents(mockEvents));

  const [profileParticipant, setProfileParticipant] = useState<Participant | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [groupChatEvent, setGroupChatEvent] = useState<Event | null>(null);
  const [groupChatOpen, setGroupChatOpen] = useState(false);
  const [dmOpen, setDmOpen] = useState(false);
  const [dmInitialId, setDmInitialId] = useState<string | null>(null);
  const [reflectionOpen, setReflectionOpen] = useState(false);

  // The most recent past event becomes the post-event reflection prompt.
  const latestPast = history[0];
  const reflectionEvent: Event | null = latestPast
    ? {
        id: latestPast.eventId,
        title: latestPast.title,
        description: '',
        date: latestPast.date,
        time: '',
        location: '',
        imageUrl: '',
        source: 'meetup',
        activityLevel: 'moderate',
        intensity: 'social',
        groupSize: 'medium',
        maxParticipants: 0,
        currentParticipants: latestPast.coAttendeeIds.length,
        participants: latestPast.coAttendeeIds
          .map(id => events.flatMap(e => e.participants).find(p => p.id === id))
          .filter(Boolean) as Participant[],
        category: latestPast.category,
        tags: [],
      }
    : null;

  // One-time nudge to reflect on the most recent past event.
  useEffect(() => {
    if (!latestPast) return;
    const key = `reflected-${latestPast.eventId}`;
    if (typeof window !== 'undefined' && !window.sessionStorage.getItem(key)) {
      window.sessionStorage.setItem(key, '1');
      const t = setTimeout(() => {
        toast({
          title: `How was ${latestPast.title}?`,
          description: 'Tag the people you clicked with — only mutual tags unlock DMs.',
        });
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [latestPast, toast]);

  const handleAttend = (eventId: string) => {
    setEvents(prev => prev.map(event =>
      event.id === eventId ? { ...event, isAttending: !event.isAttending } : event
    ));
    const event = events.find(e => e.id === eventId);
    if (event) {
      const isNowAttending = !event.isAttending;
      toast({
        title: isNowAttending ? "You're in. See you there." : 'Event removed',
        description: isNowAttending
          ? `Locked in for "${event.title}". Group chat opens before it starts.`
          : `Removed "${event.title}" from your events.`,
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

      <MomentumPanel />

      <RecommendedForYou
        events={events}
        onAttend={handleAttend}
        onParticipantClick={handleParticipantClick}
        onOpenGroupChat={handleOpenGroupChat}
      />

      {/* Post-event reflection trigger */}
      {reflectionEvent && (
        <section className="py-6">
          <div className="container px-4 md:px-6">
            <div className="max-w-5xl mx-auto bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-primary font-semibold">
                  <Sparkles className="h-3.5 w-3.5" /> Reflect
                </div>
                <h3 className="text-lg font-semibold text-foreground mt-1">
                  Who did you click with at {reflectionEvent.title}?
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Tag 1–3 people. Mutual tags unlock DMs and form crews.
                </p>
              </div>
              <Button onClick={() => setReflectionOpen(true)}>Tag attendees</Button>
            </div>
          </div>
        </section>
      )}

      <ActivityFeed />

      <GroupsSection onOpenDM={handleOpenDM} />

      <section id="events" className="py-12 md:py-16">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Upcoming Events
            </h2>
            <p className="text-muted-foreground">
              All upcoming events in your city
            </p>
          </div>

          {/* Intake form kept available but collapsed under filters — preferences seed recommendations privately, never shown on profiles. */}
          <details className="max-w-3xl mx-auto mb-6 group">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              Fine-tune what you want to see →
            </summary>
            <div className="mt-4">
              <IntakeForm
                onSubmit={(newFilters) => {
                  setFilters(prev => ({ ...prev, ...newFilters }));
                }}
              />
            </div>
          </details>

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
      <PostEventReflectionDialog
        event={reflectionEvent}
        open={reflectionOpen}
        onOpenChange={setReflectionOpen}
      />

      <footer className="bg-secondary/50 py-8 mt-12">
        <div className="container px-4 md:px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold text-foreground">Sync</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Show up. Same faces. Real friendships.
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            © 2026 Sync. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
