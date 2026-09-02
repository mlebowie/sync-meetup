import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from 'react';

export type FriendRating = 'definitely' | 'maybe' | 'no';

export interface EventRating {
  eventId: string;
  value: FriendRating;
  comment?: string;
  ratedAt: string;
}

interface EventRatingValue {
  ratings: EventRating[];
  rateEvent: (eventId: string, value: FriendRating, comment?: string) => void;
  myRating: (eventId: string) => EventRating | undefined;
  /** 0-100 "would bring a friend" score, or null when there's no data. */
  friendScore: (eventId: string) => number | null;
  ratingCount: (eventId: string) => number;
}

const KEY = 'sync.eventRatings.v1';

// Seeded community scores so existing cards show a plausible signal.
const SEEDED: Record<string, { score: number; count: number }> = {
  '1': { score: 94, count: 38 },
  '2': { score: 88, count: 21 },
  '3': { score: 91, count: 44 },
  '4': { score: 76, count: 12 },
  '5': { score: 97, count: 61 },
  '6': { score: 82, count: 17 },
  '7': { score: 90, count: 29 },
  '8': { score: 85, count: 24 },
};

const WEIGHT: Record<FriendRating, number> = { definitely: 100, maybe: 55, no: 0 };

const EventRatingContext = createContext<EventRatingValue | null>(null);

export const useEventRatings = () => {
  const ctx = useContext(EventRatingContext);
  if (!ctx) throw new Error('useEventRatings must be used within EventRatingProvider');
  return ctx;
};

const loadInitial = (): EventRating[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as EventRating[]) : [];
  } catch {
    return [];
  }
};

export const EventRatingProvider = ({ children }: { children: ReactNode }) => {
  const [ratings, setRatings] = useState<EventRating[]>(loadInitial);

  useEffect(() => {
    window.localStorage.setItem(KEY, JSON.stringify(ratings));
  }, [ratings]);

  const rateEvent = useCallback((eventId: string, value: FriendRating, comment?: string) => {
    setRatings(prev => [
      { eventId, value, comment, ratedAt: new Date().toISOString() },
      ...prev.filter(r => r.eventId !== eventId),
    ]);
  }, []);

  const myRating = useCallback(
    (eventId: string) => ratings.find(r => r.eventId === eventId),
    [ratings]
  );

  const ratingCount = useCallback(
    (eventId: string) => (SEEDED[eventId]?.count ?? 0) + (myRating(eventId) ? 1 : 0),
    [myRating]
  );

  const friendScore = useCallback(
    (eventId: string) => {
      const seed = SEEDED[eventId];
      const mine = myRating(eventId);
      if (!seed && !mine) return null;
      if (!seed && mine) return WEIGHT[mine.value];
      if (seed && !mine) return seed.score;
      const total = seed!.count + 1;
      return Math.round((seed!.score * seed!.count + WEIGHT[mine!.value]) / total);
    },
    [myRating]
  );

  const value = useMemo<EventRatingValue>(
    () => ({ ratings, rateEvent, myRating, friendScore, ratingCount }),
    [ratings, rateEvent, myRating, friendScore, ratingCount]
  );

  return <EventRatingContext.Provider value={value}>{children}</EventRatingContext.Provider>;
};
