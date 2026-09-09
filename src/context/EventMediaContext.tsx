import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from 'react';

export interface EventPhoto {
  id: string;
  eventId: string;
  /** data URL or remote image url */
  url: string;
  caption?: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  likes: number;
  likedByMe: boolean;
  createdAt: string;
}

interface EventMediaValue {
  photos: EventPhoto[];
  photosFor: (eventId: string) => EventPhoto[];
  addPhoto: (p: Omit<EventPhoto, 'id' | 'likes' | 'likedByMe' | 'createdAt'>) => void;
  toggleLike: (photoId: string) => void;
  hasPhotos: (eventId: string) => boolean;
}

const KEY = 'sync.eventPhotos.v1';
const SEEDED_KEY = 'sync.eventPhotos.seeded.v1';

const EventMediaContext = createContext<EventMediaValue | null>(null);

export const useEventMedia = () => {
  const ctx = useContext(EventMediaContext);
  if (!ctx) throw new Error('useEventMedia must be used within EventMediaProvider');
  return ctx;
};

const loadInitial = (): EventPhoto[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const stored = raw && raw !== '[]' ? (JSON.parse(raw) as EventPhoto[]) : [];
    if (stored.length) return stored;
    // Seed attendee photos for already-attended events, once per browser.
    if (!window.localStorage.getItem(SEEDED_KEY)) {
      window.localStorage.setItem(SEEDED_KEY, '1');
      return buildSeedPastEventPhotos();
    }
    return [];
  } catch {
    return [];
  }
};

/** Highest engagement first, newest breaks ties. */
const rank = (a: EventPhoto, b: EventPhoto) =>
  b.likes - a.likes || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

export const EventMediaProvider = ({ children }: { children: ReactNode }) => {
  const [photos, setPhotos] = useState<EventPhoto[]>(loadInitial);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(photos));
    } catch {
      /* storage full (large data URLs) — keep in memory only */
    }
  }, [photos]);

  const photosFor = useCallback(
    (eventId: string) => photos.filter(p => p.eventId === eventId).sort(rank),
    [photos]
  );

  const hasPhotos = useCallback(
    (eventId: string) => photos.some(p => p.eventId === eventId),
    [photos]
  );

  const addPhoto: EventMediaValue['addPhoto'] = useCallback(p => {
    setPhotos(prev => [
      {
        ...p,
        id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        likes: 0,
        likedByMe: false,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  }, []);

  const toggleLike = useCallback((photoId: string) => {
    setPhotos(prev =>
      prev.map(p =>
        p.id === photoId
          ? { ...p, likedByMe: !p.likedByMe, likes: Math.max(0, p.likes + (p.likedByMe ? -1 : 1)) }
          : p
      )
    );
  }, []);

  const value = useMemo<EventMediaValue>(
    () => ({ photos, photosFor, addPhoto, toggleLike, hasPhotos }),
    [photos, photosFor, addPhoto, toggleLike, hasPhotos]
  );

  return <EventMediaContext.Provider value={value}>{children}</EventMediaContext.Provider>;
};
