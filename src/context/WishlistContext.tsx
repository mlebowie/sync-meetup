import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { Event } from '@/types/event';
import { useToast } from '@/hooks/use-toast';
import { getUserProfile } from '@/lib/userProfile';

const KEY = 'sync.wishlist.v1';

/** Demo profile (created at login, no onboarding) starts with a couple of saved
 *  Porto events so the calendar's wishlist shows real content. */
const DEMO_SEED_WISHLIST = ['22', '25'];

interface WishlistContextValue {
  wishlist: Set<string>;
  toggle: (eventId: string) => void;
  isWishlisted: (eventId: string) => boolean;
  getWishlistedEvents: (allEvents: Event[]) => Event[];
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
};

const loadInitial = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(KEY);
    const profile = getUserProfile();
    const isDemo = !!profile && !profile.onboardedAt;
    // Demo persona with empty/absent storage gets a seeded wishlist.
    if (isDemo && (!raw || raw === '[]')) return new Set(DEMO_SEED_WISHLIST);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
};

export const WishlistProvider = ({ children, allEvents }: { children: ReactNode; allEvents: Event[] }) => {
  const [wishlist, setWishlist] = useState<Set<string>>(loadInitial);
  const { toast } = useToast();
  // Pre-mark seeded items as notified so the demo seeds don't fire toasts on load.
  const notifiedRef = useRef<Set<string>>(
    new Set(DEMO_SEED_WISHLIST.flatMap(id => [`cap-${id}`, `24h-${id}`]))
  );

  useEffect(() => {
    window.localStorage.setItem(KEY, JSON.stringify(Array.from(wishlist)));
  }, [wishlist]);

// Request browser notification permission once the user actually saves an
  // event themselves (seeded demo items alone shouldn't prompt on page load).
  useEffect(() => {
    const hasUserSaved = Array.from(wishlist).some(id => !DEMO_SEED_WISHLIST.includes(id));
    if (!hasUserSaved) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, [wishlist]);

  const notify = useCallback((title: string, body: string) => {
    toast({ title, description: body });
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try { new Notification(title, { body }); } catch { /* ignore */ }
    }
  }, [toast]);

  // Poll wishlisted events for capacity & 24h-before triggers
  useEffect(() => {
    if (wishlist.size === 0) return;
    const check = () => {
      const now = Date.now();
      allEvents.forEach(event => {
        if (!wishlist.has(event.id)) return;
        const capacityRatio = event.currentParticipants / Math.max(event.maxParticipants, 1);
        const capKey = `cap-${event.id}`;
        if (capacityRatio >= 0.85 && capacityRatio < 1 && !notifiedRef.current.has(capKey)) {
          notifiedRef.current.add(capKey);
          notify(
            'Almost full: ' + event.title,
            `Only ${event.maxParticipants - event.currentParticipants} spots left for an event on your wishlist.`
          );
        }
        const msUntil = event.date.getTime() - now;
        const dayKey = `24h-${event.id}`;
        if (msUntil > 0 && msUntil <= 24 * 60 * 60 * 1000 && !notifiedRef.current.has(dayKey)) {
          notifiedRef.current.add(dayKey);
          notify(
            'Tomorrow: ' + event.title,
            `An event on your wishlist starts in less than 24 hours. Register before it fills up.`
          );
        }
      });
    };
    check();
    const interval = setInterval(check, 60 * 1000);
    return () => clearInterval(interval);
  }, [wishlist, allEvents, notify]);

  const toggle = useCallback((eventId: string) => {
    setWishlist(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  }, []);

  const isWishlisted = useCallback((id: string) => wishlist.has(id), [wishlist]);

  const getWishlistedEvents = useCallback(
    (events: Event[]) => events.filter(e => wishlist.has(e.id)),
    [wishlist]
  );

  return (
    <WishlistContext.Provider value={{ wishlist, toggle, isWishlisted, getWishlistedEvents }}>
      {children}
    </WishlistContext.Provider>
  );
};
