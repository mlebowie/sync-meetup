import { useMemo } from 'react';
import { Event } from '@/types/event';
import { mockParticipants } from '@/data/mockData';
import { useSocial } from '@/context/SocialContext';
import { useActivityHistory } from '@/context/ActivityHistoryContext';
import { useInvites } from '@/context/InvitesContext';
import { buildInviteCandidates } from '@/lib/invites';

/** Mutual connections the user can invite to `event`, most-met first. */
export function useInviteCandidates(event: Event | null) {
  const { isMutual } = useSocial();
  const { isConnected, crossedPathsWith } = useActivityHistory();
  const { getInvited } = useInvites();
  const invited = event ? getInvited(event.id) : [];

  return useMemo(() => {
    if (!event) return [];
    return buildInviteCandidates({
      people: mockParticipants,
      isConnection: id => isMutual(id) || isConnected(id),
      sharedEvents: crossedPathsWith,
      goingIds: event.participants.map(p => p.id),
      invitedIds: invited,
    });
    // `invited` is a fresh array each render; key on its contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, isMutual, isConnected, crossedPathsWith, invited.join(',')]);
}
