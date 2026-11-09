import { describe, expect, it } from 'vitest';
import { buildInviteCandidates, namesSummary, sharedEventsLabel } from '@/lib/invites';
import { Participant } from '@/types/event';

const person = (id: string, name: string): Participant => ({ id, name, avatar: '' });
const people = [person('1', 'Tom B.'), person('2', 'James L.'), person('3', 'Marco K.'), person('4', 'David R.')];
const shared: Record<string, number> = { '1': 6, '2': 2, '3': 9, '4': 4 };

describe('buildInviteCandidates', () => {
  it('only lists mutual connections, most events together first', () => {
    const list = buildInviteCandidates({
      people,
      isConnection: id => id !== '4',
      sharedEvents: id => shared[id] ?? 0,
      goingIds: [],
      invitedIds: [],
    });
    expect(list.map(c => c.participant.id)).toEqual(['3', '1', '2']);
  });

  it('keeps people already going but puts them last', () => {
    const list = buildInviteCandidates({
      people,
      isConnection: () => true,
      sharedEvents: id => shared[id] ?? 0,
      goingIds: ['3'],
      invitedIds: ['2'],
    });
    expect(list.map(c => c.participant.id)).toEqual(['1', '4', '2', '3']);
    expect(list[3].alreadyGoing).toBe(true);
    expect(list.find(c => c.participant.id === '2')?.alreadyInvited).toBe(true);
  });
});

describe('invite copy', () => {
  it('summarises names by first name', () => {
    expect(namesSummary([])).toBe('');
    expect(namesSummary(['Priya N.'])).toBe('Priya');
    expect(namesSummary(['Priya N.', 'Tom B.'])).toBe('Priya and Tom');
    expect(namesSummary(['Priya N.', 'Tom B.', 'Marco K.'])).toBe('Priya, Tom and 1 other');
    expect(namesSummary(['Priya N.', 'Tom B.', 'Marco K.', 'Ben H.'])).toBe('Priya, Tom and 2 others');
  });

  it('describes how they met', () => {
    expect(sharedEventsLabel(0)).toBe('Connected on SYNC');
    expect(sharedEventsLabel(1)).toBe('Met at 1 event');
    expect(sharedEventsLabel(5)).toBe('Met at 5 events');
  });
});
