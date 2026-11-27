/**
 * Your private memory of each connection: a few keywords about how you met ("salsa, from Berlin,
 * training for a half marathon"). One note per person, kept on this device, shared by the
 * Connections page and the 1:1 chat so editing it in one shows in the other.
 */
import { useSyncExternalStore } from 'react';
import { PastAttendance, TaggedConnection } from '@/types/event';

const KEY = 'sync.connectionNotes.v1';
/** Older per-event notes from the "Your tags" list ("<personId>::<eventId>" -> text). */
const LEGACY_KEY = 'sync:tag-notes';
export const NOTE_MAX = 140;

const read = (): Record<string, string> => {
  try {
    const current = JSON.parse(window.localStorage.getItem(KEY) ?? '{}') as Record<string, string>;
    // Carry over older per-event notes, once, for people without a note yet.
    const legacy = JSON.parse(window.localStorage.getItem(LEGACY_KEY) ?? '{}') as Record<string, string>;
    Object.entries(legacy).forEach(([k, text]) => {
      const id = k.split('::')[0];
      if (id && text?.trim() && !current[id]) current[id] = text;
    });
    return current;
  } catch {
    return {};
  }
};

let notes: Record<string, string> = typeof window === 'undefined' ? {} : read();
const listeners = new Set<() => void>();

export const getConnectionNote = (personId: string) => notes[personId] ?? '';

export const setConnectionNote = (personId: string, text: string) => {
  notes = { ...notes, [personId]: text.slice(0, NOTE_MAX) };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(notes));
  } catch {
    // Storage blocked: the note lasts until the page reloads.
  }
  listeners.forEach(l => l());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The note for one person, kept in step everywhere it is shown. */
export const useConnectionNote = (personId: string | null): [string, (text: string) => void] => {
  const value = useSyncExternalStore(subscribe, () => (personId ? notes[personId] ?? '' : ''));
  return [value, (text: string) => personId && setConnectionNote(personId, text)];
};

/**
 * The most recent event you were both at: from your tags of them and from past events where
 * they were among the attendees.
 */
export const lastMetAt = (
  personId: string,
  tags: TaggedConnection[],
  history: PastAttendance[],
): { title: string; date: Date } | null => {
  const seen = [
    ...tags.filter(t => t.participantId === personId).map(t => ({ title: t.eventTitle, date: new Date(t.taggedAt) })),
    ...history.filter(h => h.coAttendeeIds.includes(personId)).map(h => ({ title: h.title, date: new Date(h.date) })),
  ];
  return seen.sort((a, b) => b.date.getTime() - a.date.getTime())[0] ?? null;
};
