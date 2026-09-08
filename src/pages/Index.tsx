import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import ParticipantProfileDialog from '@/components/ParticipantProfileDialog';
import EventGroupChatDialog from '@/components/EventGroupChatDialog';
import DirectMessagesDialog from '@/components/DirectMessagesDialog';
import MomentumPanel from '@/components/MomentumPanel';
import ActivityFeed from '@/components/ActivityFeed';

import PostEventReflectionDialog from '@/components/PostEventReflectionDialog';
import GuestLanding from '@/components/GuestLanding';
import FeedSetupBanner from '@/components/FeedSetupBanner';
import HowSyncWorks from '@/components/HowSyncWorks';
import RecommendedCarousel from '@/components/RecommendedCarousel';
import FriendsLoveSection from '@/components/FriendsLoveSection';
import UpcomingEventsSection from '@/components/UpcomingEventsSection';
import PopularTrendingSection from '@/components/PopularTrendingSection';
import { mockEvents } from '@/data/mockData';
import { getDailyRotatingEvents } from '@/lib/dailyEvents';
import { Event, Participant } from '@/types/event';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { MessageCircle, Sparkles } from 'lucide-react';
import { useActivityHistory } from '@/context/ActivityHistoryContext';
import { getUserProfile } from '@/lib/userProfile';
import { getReflectionCandidate } from '@/lib/reflection';
import { useSearchParams } from 'react-router-dom';
import { useSearch } from '@/context/SearchContext';

const Index = () => {
  const { toast } = useToast();
  const { history, tags } = useActivityHistory();
  const profile = getUserProfile();
  const isGuest = !profile;
const [events, setEvents] = useState<Event[]>(() => getDailyRotatingEvents(mockEvents));

  const [searchParams, setSearchParams] = useSearchParams();
  const { setQuery } = useSearch();

  // Pick up a search handed off from the header on another page (?q=...&event=...).
  useEffect(() => {
    const q = searchParams.get('q');
    if (q == null) return;
    const eventId = searchParams.get('event');
    setQuery(q);
    const t = setTimeout(() => {
      const target = eventId ? document.getElementById(`event-${eventId}`) : null;
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      else document.getElementById('upcoming')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 400);
    setSearchParams({}, { replace: true });
    return () => clearTimeout(t);
  }, [searchParams, setSearchParams, setQuery]);

  const [profileParticipant, setProfileParticipant] = useState<Participant | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [groupChatEvent, setGroupChatEvent] = useState<Event | null>(null);
  const [groupChatOpen, setGroupChatOpen] = useState(false);
  const [dmOpen, setDmOpen] = useState(false);
  const [dmInitialId, setDmInitialId] = useState<string | null>(null);
  const [dmMetAt, setDmMetAt] = useState<string | null>(null);
  const [reflectionOpen, setReflectionOpen] = useState(false);

  // The most recent past event becomes the post-event reflection prompt.
  const latestPast = getReflectionCandidate(history, profile);
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

  const alreadyTagged = latestPast ? tags.some(t => t.eventId === latestPast.eventId) : false;

  // One-time nudge to reflect on the most recent past event.
  useEffect(() => {
    if (isGuest) return;
    if (!latestPast) return;
    if (alreadyTagged) return;
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
  }, [latestPast, toast, isGuest, alreadyTagged]);

  const handleAttend = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      // EventCard toggles the attending store before calling this, so the value
      // read here is the pre-toggle one.
      const isNowAttending = !isAttendingFn(eventId);
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

  const handleOpenDM = (participantId: string, metAtEventTitle?: string) => {
    setDmInitialId(participantId);
    setDmMetAt(metAtEventTitle ?? null);
    setDmOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onOpenMessages={() => { setDmInitialId(null); setDmMetAt(null); setDmOpen(true); }} />

      {isGuest ? (
        <>
          <Hero />
          <HowSyncWorks />
          <GuestLanding
            onAttend={handleAttend}
            onParticipantClick={handleParticipantClick}
          />
        </>
      ) : (
        <>
          {/* 0) First-run tutorial banner */}
          <FeedSetupBanner interests={profile?.interests ?? []} />

          {/* 1) Reflect from last event attended */}
          {reflectionEvent && !alreadyTagged && (
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
                      Rate it, tag up to 3 people, and add a photo to the event card.
                    </p>
                  </div>
                  <Button onClick={() => setReflectionOpen(true)}>Start recap</Button>
                </div>
              </div>
            </section>
          )}

{/* 2) Recommended for you */}
          <RecommendedCarousel
            profile={profile!}
            onAttend={handleAttend}
            onParticipantClick={handleParticipantClick}
            onOpenGroupChat={handleOpenGroupChat}
          />

          {/* 3) Upcoming events with expanded filters */}
          <UpcomingEventsSection
            events={events}
            profile={profile!}
            onAttend={handleAttend}
            onParticipantClick={handleParticipantClick}
            onOpenGroupChat={handleOpenGroupChat}
          />

          {/* 4) Events your friends love */}
          <FriendsLoveSection
            interests={profile?.interests ?? []}
            onAttend={handleAttend}
            onParticipantClick={handleParticipantClick}
            onOpenGroupChat={handleOpenGroupChat}
          />

          {/* 5) Popular & Trending one-time events */}
          <PopularTrendingSection
            interests={profile?.interests ?? []}
            onAttend={handleAttend}
            onParticipantClick={handleParticipantClick}
            onOpenGroupChat={handleOpenGroupChat}
          />

          {/* Bottom: momentum, activity, crews */}
          <MomentumPanel />
          <ActivityFeed />

          <Button
            variant="hero"
            size="icon"
            className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-40"
            onClick={() => { setDmInitialId(null); setDmMetAt(null); setDmOpen(true); }}
            title="Direct messages"
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
        </>
      )}


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
        metAtEventTitle={dmMetAt}
      />
      <PostEventReflectionDialog
        event={reflectionEvent}
        open={reflectionOpen}
        onOpenChange={setReflectionOpen}
        onOpenDM={handleOpenDM}
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
