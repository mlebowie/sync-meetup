import { Participant } from '@/types/event';

/** Someone the user can invite to an event, with why they are on the list. */
export interface InviteCandidate {
  participant: Participant;
  /** Events the user and this person have attended together. */
  sharedEvents: number;
  /** Already registered for the event, so they can't be invited. */
  alreadyGoing: boolean;
  /** Already invited to this event by the user. */
  alreadyInvited: boolean;
}

interface BuildOptions {
  people: Participant[];
  /** True for mutual connections (both follow each other, or tagged each other). */
  isConnection: (id: string) => boolean;
  /** Number of events attended together. */
  sharedEvents: (id: string) => number;
  goingIds: Iterable<string>;
  invitedIds: Iterable<string>;
}

/**
 * Mutual connections the user can invite, people they've been to most events
 * with first. Anyone already going stays on the list (shown as "Already going")
 * but sorts last, so nobody gets invited to something they've already joined.
 */
export function buildInviteCandidates({ people, isConnection, sharedEvents, goingIds, invitedIds }: BuildOptions): InviteCandidate[] {
  const going = new Set(goingIds);
  const invited = new Set(invitedIds);
  return people
    .filter(p => isConnection(p.id))
    .map(p => ({
      participant: p,
      sharedEvents: sharedEvents(p.id),
      alreadyGoing: going.has(p.id),
      alreadyInvited: invited.has(p.id),
    }))
    .sort((a, b) =>
      Number(a.alreadyGoing) - Number(b.alreadyGoing)
      || b.sharedEvents - a.sharedEvents
      || a.participant.name.localeCompare(b.participant.name));
}

/** "Priya", "Priya and Jonas", "Priya, Jonas and 2 others". */
export function namesSummary(names: string[]): string {
  const first = names.map(n => n.split(' ')[0]);
  if (first.length === 0) return '';
  if (first.length === 1) return first[0];
  if (first.length === 2) return `${first[0]} and ${first[1]}`;
  const rest = first.length - 2;
  return `${first[0]}, ${first[1]} and ${rest} ${rest === 1 ? 'other' : 'others'}`;
}

/** What the met-at line under a name says. */
export function sharedEventsLabel(count: number): string {
  if (count <= 0) return 'Connected on SYNC';
  return count === 1 ? 'Met at 1 event' : `Met at ${count} events`;
}

/** "Priya N." → "PN", for avatar fallbacks. */
export const initials = (name: string) =>
  name.split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
