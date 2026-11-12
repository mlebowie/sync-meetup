import { useState, useEffect, useRef } from 'react';
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
import HappeningSoonSection from '@/components/HappeningSoonSection';
import RecommendedSection from '@/components/RecommendedSection';
import HomeFilterBar from '@/components/HomeFilterBar';
import FriendsLoveSection from '@/components/FriendsLoveSection';
import UpcomingEventsSection from '@/components/UpcomingEventsSection';
import PopularTrendingSection from '@/components/PopularTrendingSection';
import FeaturedPartnerSection from '@/components/FeaturedPartnerSection';
import { useEvents } from '@/context/EventsContext';
import { Event, Participant } from '@/types/event';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import syncWordmark from '@/assets/sync-wordmark-v2.png';
import { MessageCircle, Sparkles } from 'lucide-react';
import { useActivityHistory } from '@/context/ActivityHistoryContext';
import { getUserProfile, saveUserProfile } from '@/lib/userProfile';
import { DEFAULT_FEED_FILTERS, FeedFilters, hidesCategoryPill } from '@/lib/feedFilters';
import { getReflectionCandidate } from '@/lib/reflection';
import { useSearchParams } from 'react-router-dom';
import { useSearch } from '@/context/SearchContext';
import { useAttending } from '@/context/AttendingContext';

const Index = () => {
  const { toast } = useToast();
  const { history, tags } = useActivityHistory();
  const { isAttending: isAttendingFn } = useAttending();
  // Re-read the local profile when it changes, e.g. right after a Google sign-in
  // lands back here and AuthProfileSync creates it.
  const [, setProfileVersion] = useState(0);
  const profile = getUserProfile();
  const isGuest = !profile;
  const { events } = useEvents();

  // One set of filters for the whole feed, edited from the pinned bar.
  const [feedFilters, setFeedFilters] = useState<FeedFilters>(DEFAULT_FEED_FILTERS);
  const [profileInterests, setProfileInterests] = useState<string[]>(profile?.interests ?? []);

  useEffect(() => {
    const onProfileChanged = () => {
      setProfileVersion(v => v + 1);
      setProfileInterests(getUserProfile()?.interests ?? []);
    };
    window.addEventListener('sync:profile-changed', onProfileChanged);
    return () => window.removeEventListener('sync:profile-changed', onProfileChanged);
  }, []);
  const hideCategory = hidesCategoryPill(feedFilters);
  const barInterestsRef = useRef<HTMLDivElement>(null);
  const barInclusivityRef = useRef<HTMLDivElement>(null);

  const saveInterests = (ids: string[]) => {
    const current = getUserProfile();
    if (!current) return;
    const next = [...current.interests, ...ids.filter(id => !current.interests.includes(id))];
    saveUserProfile({ ...current, interests: next });
    setProfileInterests(next);
    toast({ title: 'Saved to your interests', description: 'They now show in your feed by default.' });
  };

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
                vibe: 'social',
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
          <FeedSetupBanner interests={profileInterests} />

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

{/* Featured partner events, pinned from /curate (editorial, not filtered) */}
          <FeaturedPartnerSection
            onAttend={handleAttend}
            onParticipantClick={handleParticipantClick}
            onOpenGroupChat={handleOpenGroupChat}
          />

          {/* 2) One filter bar for the whole feed, pinned under the header */}
          <HomeFilterBar
            value={feedFilters}
            onChange={setFeedFilters}
            profileInterests={profileInterests}
            onSaveInterests={saveInterests}
            interestsRef={barInterestsRef}
            inclusivityRef={barInclusivityRef}
          />

          {/* 3) Starting in the next 6 hours: interests apply, time chips don't */}
          <HappeningSoonSection
            filters={feedFilters}
            profileInterests={profileInterests}
            hideCategory={hideCategory}
            onAttend={handleAttend}
            onParticipantClick={handleParticipantClick}
            onOpenGroupChat={handleOpenGroupChat}
          />

          {/* 4) Recommended for you: filtered, ranked by familiar faces */}
          <RecommendedSection
            filters={feedFilters}
            profileInterests={profileInterests}
            hideCategory={hideCategory}
            onAttend={handleAttend}
            onParticipantClick={handleParticipantClick}
            onOpenGroupChat={handleOpenGroupChat}
          />

          {/* 5) Popular & Trending: most popular within the filter */}
          <PopularTrendingSection
            interests={profileInterests}
            feedFilters={feedFilters}
            hideCategory={hideCategory}
            onAttend={handleAttend}
            onParticipantClick={handleParticipantClick}
            onOpenGroupChat={handleOpenGroupChat}
          />

          {/* 6) Where the people you follow show up: about people, so not filtered */}
          <FriendsLoveSection
            interests={profileInterests}
            onAttend={handleAttend}
            onParticipantClick={handleParticipantClick}
            onOpenGroupChat={handleOpenGroupChat}
          />

          {/* 7) Upcoming events: the full list, with search and finer filters */}
          <UpcomingEventsSection
            events={events}
            profile={profile!}
            filters={feedFilters}
            profileInterests={profileInterests}
            hideCategory={hideCategory}
            barInterestsRef={barInterestsRef}
            barInclusivityRef={barInclusivityRef}
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
          <div className="flex items-center justify-center mb-4">
            <img src={syncWordmark} alt="SYNC" className="h-8 w-auto" />
          </div>
          <p className="text-sm text-muted-foreground">
            Less searching. More belonging.
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
