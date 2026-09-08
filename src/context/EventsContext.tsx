import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Event } from '@/types/event';
import { mockEvents } from '@/data/mockData';
import { fetchLiveEvents } from '@/lib/liveEvents';
import { getDailyRotatingEvents } from '@/lib/dailyEvents';

interface EventsContextValue {
  /** Real events from the collector; sample events only while loading or if none were collected. */
  events: Event[];
  loading: boolean;
  /** True when the list is real collected data rather than the sample set. */
  isLive: boolean;
  updatedAt: Date | null;
  error: string | null;
}

const fallback = () => getDailyRotatingEvents(mockEvents);

const EventsContext = createContext<EventsContextValue>({
  events: [],
  loading: true,
  isLive: false,
  updatedAt: null,
  error: null,
});

export const useEvents = () => useContext(EventsContext);

export const EventsProvider = ({ children }: { children: ReactNode }) => {
  const [live, setLive] = useState<Event[] | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLiveEvents()
      .then(({ events, updatedAt }) => {
        if (cancelled) return;
        if (events.length) {
          setLive(events);
          setUpdatedAt(updatedAt);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sample = useMemo(fallback, []);
  const value = useMemo<EventsContextValue>(
    () => ({
      events: live ?? sample,
      loading,
      isLive: !!live,
      updatedAt,
      error,
    }),
    [live, sample, loading, updatedAt, error],
  );

  // Hold rendering until the first fetch settles, so downstream memoised feeds
  // are computed from the real event list rather than the sample set.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" aria-label="Loading events" />
      </div>
    );
  }

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
};
