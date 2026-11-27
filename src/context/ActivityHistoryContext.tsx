import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from 'react';
import { PastAttendance, TaggedConnection } from '@/types/event';
import { useAdmin } from '@/hooks/useAdmin';
import { getUserProfile } from '@/lib/userProfile';
import { DEMO_CONNECTION_TAGS, isTestMode } from '@/lib/testMode';

const TEST_TAGS_KEY = 'sync.testTags.v1';

/** Test mode keeps your tags across reloads, so a demo survives a refresh. */
const loadTestTags = (): TaggedConnection[] => {
  try {
    const raw = window.localStorage.getItem(TEST_TAGS_KEY);
    const list = raw ? (JSON.parse(raw) as TaggedConnection[]) : [];
    return list.map(t => ({ ...t, taggedAt: new Date(t.taggedAt) }));
  } catch {
    return [];
  }
};

interface ActivityHistoryValue {
  history: PastAttendance[];
  addAttendance: (a: PastAttendance) => void;
  /** How many times the user has shown up to a given series. */
  seriesCount: (seriesId?: string) => number;
  /** How many times the user has crossed paths with another user. */
  crossedPathsWith: (participantId: string) => number;
  /** All participant ids the user has crossed paths with, ordered by frequency. */
  topCoAttendees: () => { id: string; count: number }[];
  /** Categories ranked by how often the user attends them. */
  categoryAffinity: () => Record<string, number>;
  /** Tagged-after-event connections (mutual = full connection unlocked). */
  tags: TaggedConnection[];
  tagAttendee: (t: TaggedConnection) => void;
  /** Simulate that some attendees have already tagged the user back. */
  hasTaggedMe: (participantId: string) => boolean;
  /** Two-way tagged connection — strongest signal, unlocks DMs. */
  isConnected: (participantId: string) => boolean;
  /** Everyone you are connected with: you tagged each other after the same event. */
  connectionIds: Set<string>;
}

const ActivityHistoryContext = createContext<ActivityHistoryValue | null>(null);

export const useActivityHistory = () => {
  const ctx = useContext(ActivityHistoryContext);
  if (!ctx) throw new Error('useActivityHistory must be used within ActivityHistoryProvider');
  return ctx;
};

// Simulate: these mock users have already tagged "me" after past events.
const SEEDED_TAGS_OF_ME = new Set(['1', '4', '6', '7', '9', '12', '13']);

export const ActivityHistoryProvider = ({ children }: { children: ReactNode }) => {
  const [history, setHistory] = useState<PastAttendance[]>([]);
  const [ownTags, setOwnTags] = useState<TaggedConnection[]>([]);

  // Test mode (admins on their own profile, src/lib/testMode.ts): demo connections, and every tag is returned.
  const { isAdmin, email: sessionEmail } = useAdmin();
  const [profileVersion, setProfileVersion] = useState(0);
  useEffect(() => {
    const bump = () => setProfileVersion(v => v + 1);
    window.addEventListener('sync:profile-changed', bump);
    return () => window.removeEventListener('sync:profile-changed', bump);
  }, []);
  const testOn = useMemo(
    () => isTestMode({ isAdmin, sessionEmail, profileEmail: getUserProfile()?.email ?? null }),
    // profileVersion: re-check when the profile on this device changes (e.g. right after signing in).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAdmin, sessionEmail, profileVersion],
  );
  useEffect(() => {
    if (testOn) setOwnTags(prev => (prev.length ? prev : loadTestTags()));
  }, [testOn]);
  useEffect(() => {
    if (!testOn) return;
    try {
      window.localStorage.setItem(TEST_TAGS_KEY, JSON.stringify(ownTags));
    } catch {
      // Storage blocked: the demo still works until the page reloads.
    }
  }, [testOn, ownTags]);

  const tags = useMemo<TaggedConnection[]>(() => {
    if (!testOn) return ownTags;
    const demo = DEMO_CONNECTION_TAGS
      .filter(d => !ownTags.some(t => t.participantId === d.participantId))
      .map(d => ({
        participantId: d.participantId,
        eventId: d.eventId,
        eventTitle: d.eventTitle,
        taggedAt: new Date(Date.now() - d.daysAgo * 24 * 60 * 60 * 1000),
      }));
    return [...demo, ...ownTags];
  }, [testOn, ownTags]);

  const addAttendance = useCallback((a: PastAttendance) => {
    setHistory(prev => [a, ...prev]);
  }, []);

  const seriesCount = useCallback((seriesId?: string) => {
    if (!seriesId) return 0;
    return history.filter(h => h.seriesId === seriesId).length;
  }, [history]);

  const crossedPathsWith = useCallback((participantId: string) => {
    return history.reduce((acc, h) => acc + (h.coAttendeeIds.includes(participantId) ? 1 : 0), 0);
  }, [history]);

  const topCoAttendees = useCallback(() => {
    const counts: Record<string, number> = {};
    history.forEach(h => h.coAttendeeIds.forEach(id => { counts[id] = (counts[id] || 0) + 1; }));
    return Object.entries(counts)
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count);
  }, [history]);

  const categoryAffinity = useCallback(() => {
    const counts: Record<string, number> = {};
    history.forEach(h => { counts[h.category] = (counts[h.category] || 0) + 1; });
    return counts;
  }, [history]);

  const tagAttendee = useCallback((t: TaggedConnection) => {
    setOwnTags(prev => prev.some(x => x.participantId === t.participantId && x.eventId === t.eventId)
      ? prev
      : [...prev, t]);
  }, []);

  // In test mode everyone tags you back, so any tag unlocks a conversation.
  const hasTaggedMe = useCallback((id: string) => testOn || SEEDED_TAGS_OF_ME.has(id), [testOn]);

  const isConnected = useCallback((id: string) => {
    return tags.some(t => t.participantId === id) && hasTaggedMe(id);
  }, [tags, hasTaggedMe]);

  const connectionIds = useMemo(
    () => new Set(tags.filter(t => hasTaggedMe(t.participantId)).map(t => t.participantId)),
    [tags, hasTaggedMe],
  );

  const value = useMemo<ActivityHistoryValue>(() => ({
    history,
    addAttendance,
    seriesCount,
    crossedPathsWith,
    topCoAttendees,
    categoryAffinity,
    tags,
    tagAttendee,
    hasTaggedMe,
    isConnected,
    connectionIds,
  }), [history, addAttendance, seriesCount, crossedPathsWith, topCoAttendees, categoryAffinity, tags, tagAttendee, hasTaggedMe, isConnected, connectionIds]);

  return (
    <ActivityHistoryContext.Provider value={value}>{children}</ActivityHistoryContext.Provider>
  );
};


