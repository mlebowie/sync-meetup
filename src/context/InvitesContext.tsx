import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';

/**
 * Who the user has invited to which event. Like attending and connections,
 * this is saved in the browser for now; when user data moves to Supabase
 * (see roadmap.md) it becomes an `event_invites` table and the invited
 * person gets a notification.
 */
const KEY = 'sync.invites.v1';

type InviteMap = Record<string, string[]>;

interface InvitesContextValue {
  getInvited: (eventId: string) => string[];
  invite: (eventId: string, participantIds: string[]) => void;
  uninvite: (eventId: string, participantIds: string[]) => void;
}

const InvitesContext = createContext<InvitesContextValue | null>(null);

export const useInvites = () => {
  const ctx = useContext(InvitesContext);
  if (!ctx) throw new Error('useInvites must be used within InvitesProvider');
  return ctx;
};

const load = (): InviteMap => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
};

export const InvitesProvider = ({ children }: { children: ReactNode }) => {
  const [invites, setInvites] = useState<InviteMap>(load);

  useEffect(() => {
    try { window.localStorage.setItem(KEY, JSON.stringify(invites)); } catch { /* storage full or blocked */ }
  }, [invites]);

  const getInvited = useCallback((eventId: string) => invites[eventId] ?? [], [invites]);

  const invite = useCallback((eventId: string, ids: string[]) => {
    setInvites(prev => {
      const next = new Set(prev[eventId] ?? []);
      ids.forEach(id => next.add(id));
      return { ...prev, [eventId]: Array.from(next) };
    });
  }, []);

  const uninvite = useCallback((eventId: string, ids: string[]) => {
    setInvites(prev => {
      const drop = new Set(ids);
      const left = (prev[eventId] ?? []).filter(id => !drop.has(id));
      const next = { ...prev };
      if (left.length) next[eventId] = left; else delete next[eventId];
      return next;
    });
  }, []);

  return (
    <InvitesContext.Provider value={{ getInvited, invite, uninvite }}>
      {children}
    </InvitesContext.Provider>
  );
};
