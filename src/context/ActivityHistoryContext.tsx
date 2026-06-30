import { createContext, useContext, useMemo, useState, ReactNode, useCallback } from 'react';
import { PastAttendance, TaggedConnection } from '@/types/event';
import { currentUserHistory } from '@/data/mockData';

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
}

const ActivityHistoryContext = createContext<ActivityHistoryValue | null>(null);

export const useActivityHistory = () => {
  const ctx = useContext(ActivityHistoryContext);
  if (!ctx) throw new Error('useActivityHistory must be used within ActivityHistoryProvider');
  return ctx;
};

// Simulate: these mock users have already tagged "me" after past events.
const SEEDED_TAGS_OF_ME = new Set(['1', '4', '6']);

export const ActivityHistoryProvider = ({ children }: { children: ReactNode }) => {
  const [history, setHistory] = useState<PastAttendance[]>(currentUserHistory);
  const [tags, setTags] = useState<TaggedConnection[]>([]);

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
    setTags(prev => prev.some(x => x.participantId === t.participantId && x.eventId === t.eventId)
      ? prev
      : [...prev, t]);
  }, []);

  const hasTaggedMe = useCallback((id: string) => SEEDED_TAGS_OF_ME.has(id), []);

  const isConnected = useCallback((id: string) => {
    return tags.some(t => t.participantId === id) && SEEDED_TAGS_OF_ME.has(id);
  }, [tags]);

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
  }), [history, addAttendance, seriesCount, crossedPathsWith, topCoAttendees, categoryAffinity, tags, tagAttendee, hasTaggedMe, isConnected]);

  return (
    <ActivityHistoryContext.Provider value={value}>{children}</ActivityHistoryContext.Provider>
  );
};

// Re-export for components that want display names
export { mockParticipants };
