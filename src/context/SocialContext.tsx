import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { ChatMessage, Participant, Organizer } from '@/types/event';
import { currentUser } from '@/data/mockData';

interface DMThread {
  withId: string;
  messages: ChatMessage[];
}

export interface OrganizerDMThread {
  organizer: Organizer;
  eventTitle: string;
  messages: ChatMessage[];
}

interface GroupChat {
  eventId: string;
  messages: ChatMessage[];
}

interface SocialContextValue {
  currentUser: Participant;
  following: Set<string>;
  followers: Set<string>;
  toggleFollow: (id: string) => void;
  isMutual: (id: string) => boolean;
  dms: Record<string, DMThread>;
  sendDM: (toId: string, content: string) => void;
  organizerDms: Record<string, OrganizerDMThread>;
  sendOrganizerMessage: (organizer: Organizer, eventTitle: string, content: string) => void;
  groupChats: Record<string, GroupChat>;
  sendGroupMessage: (eventId: string, content: string, type?: 'text' | 'meme') => void;
  ensureGroupChat: (eventId: string, seedMessages: ChatMessage[]) => void;
}


const SocialContext = createContext<SocialContextValue | null>(null);

export const useSocial = () => {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error('useSocial must be used within SocialProvider');
  return ctx;
};

export const SocialProvider = ({ children }: { children: ReactNode }) => {
  const [following, setFollowing] = useState<Set<string>>(new Set());
  // Simulate that some users already follow "me" so mutual follow can happen
  const [followers] = useState<Set<string>>(new Set(['1', '2', '4', '6']));
  const [dms, setDms] = useState<Record<string, DMThread>>({});
  const [organizerDms, setOrganizerDms] = useState<Record<string, OrganizerDMThread>>({});
  const [groupChats, setGroupChats] = useState<Record<string, GroupChat>>({});


  const toggleFollow = useCallback((id: string) => {
    setFollowing(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isMutual = useCallback((id: string) => following.has(id) && followers.has(id), [following, followers]);

  const sendDM = useCallback((toId: string, content: string) => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      content,
      type: 'text',
      timestamp: new Date(),
    };
    setDms(prev => ({
      ...prev,
      [toId]: {
        withId: toId,
        messages: [...(prev[toId]?.messages || []), msg],
      },
    }));
  }, []);

  const ensureGroupChat = useCallback((eventId: string, seedMessages: ChatMessage[]) => {
    setGroupChats(prev => {
      if (prev[eventId]) return prev;
      return { ...prev, [eventId]: { eventId, messages: seedMessages } };
    });
  }, []);

  const sendGroupMessage = useCallback((eventId: string, content: string, type: 'text' | 'meme' = 'text') => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      content,
      type,
      timestamp: new Date(),
    };
    setGroupChats(prev => ({
      ...prev,
      [eventId]: {
        eventId,
        messages: [...(prev[eventId]?.messages || []), msg],
      },
    }));
  }, []);

  return (
    <SocialContext.Provider
      value={{
        currentUser,
        following,
        followers,
        toggleFollow,
        isMutual,
        dms,
        sendDM,
        groupChats,
        sendGroupMessage,
        ensureGroupChat,
      }}
    >
      {children}
    </SocialContext.Provider>
  );
};
