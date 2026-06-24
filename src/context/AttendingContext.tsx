import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Event } from '@/types/event';

const KEY = 'sync.attending.v1';
const PREFS_KEY = 'sync.attending.prefs.v1';

export type ReminderMethod = 'none' | 'sms' | 'email';

export interface AttendingPrefs {
  reminder: ReminderMethod;
  push: boolean;
  contact?: string;
}

interface AttendingContextValue {
  attending: Set<string>;
  prefs: Record<string, AttendingPrefs>;
  toggle: (eventId: string) => boolean; // returns next attending state
  setAttending: (eventId: string, value: boolean) => void;
  isAttending: (eventId: string) => boolean;
  getAttendingEvents: (allEvents: Event[]) => Event[];
  updatePrefs: (eventId: string, patch: Partial<AttendingPrefs>) => void;
  getPrefs: (eventId: string) => AttendingPrefs;
}

const DEFAULT_PREFS: AttendingPrefs = { reminder: 'none', push: true };

const AttendingContext = createContext<AttendingContextValue | null>(null);

export const useAttending = () => {
  const ctx = useContext(AttendingContext);
  if (!ctx) throw new Error('useAttending must be used within AttendingProvider');
  return ctx;
};

const loadSet = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
};

const loadPrefs = (): Record<string, AttendingPrefs> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

export const AttendingProvider = ({ children }: { children: ReactNode }) => {
  const [attending, setAttendingState] = useState<Set<string>>(loadSet);
  const [prefs, setPrefs] = useState<Record<string, AttendingPrefs>>(loadPrefs);

  useEffect(() => {
    window.localStorage.setItem(KEY, JSON.stringify(Array.from(attending)));
  }, [attending]);

  useEffect(() => {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const toggle = useCallback((eventId: string) => {
    let nextState = false;
    setAttendingState(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) { next.delete(eventId); nextState = false; }
      else { next.add(eventId); nextState = true; }
      return next;
    });
    setPrefs(prev => prev[eventId] ? prev : { ...prev, [eventId]: { ...DEFAULT_PREFS } });
    return nextState;
  }, []);

  const setAttending = useCallback((eventId: string, value: boolean) => {
    setAttendingState(prev => {
      const next = new Set(prev);
      if (value) next.add(eventId); else next.delete(eventId);
      return next;
    });
    if (value) setPrefs(prev => prev[eventId] ? prev : { ...prev, [eventId]: { ...DEFAULT_PREFS } });
  }, []);

  const isAttending = useCallback((id: string) => attending.has(id), [attending]);

  const getAttendingEvents = useCallback(
    (events: Event[]) => events.filter(e => attending.has(e.id)),
    [attending]
  );

  const updatePrefs = useCallback((eventId: string, patch: Partial<AttendingPrefs>) => {
    setPrefs(prev => ({ ...prev, [eventId]: { ...DEFAULT_PREFS, ...prev[eventId], ...patch } }));
  }, []);

  const getPrefs = useCallback((eventId: string) => prefs[eventId] ?? DEFAULT_PREFS, [prefs]);

  return (
    <AttendingContext.Provider value={{ attending, prefs, toggle, setAttending, isAttending, getAttendingEvents, updatePrefs, getPrefs }}>
      {children}
    </AttendingContext.Provider>
  );
};
