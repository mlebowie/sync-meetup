/**
 * Plan reminders in a 1:1 chat: a nudge to make plans 3 days, 1 week, 2 weeks and 1 month after
 * two people connect, until they have made plans. Each person's reminders can be turned off and
 * back on at any time; "We've made plans" stops them too. Kept on this device.
 */
import { useSyncExternalStore } from 'react';

const DAY_MS = 24 * 60 * 60 * 1000;

export const PLAN_REMINDERS: { days: number; title: (firstName: string, eventTitle: string) => string }[] = [
  { days: 3, title: (name, event) => `3 days since ${event}. Fancy making a plan with ${name}?` },
  { days: 7, title: name => `A week since you met. A quick plan with ${name} keeps it going.` },
  { days: 14, title: (name, event) => `Two weeks since ${event}. There's still time to meet ${name} again.` },
  { days: 30, title: name => `A month since you met. Pick something easy to do with ${name}.` },
];

/** The latest reminder that is due (the earlier ones give way to it), or null before 3 days. */
export const dueReminder = (connectedAt: Date, now = new Date()) => {
  const days = (now.getTime() - new Date(connectedAt).getTime()) / DAY_MS;
  return [...PLAN_REMINDERS].reverse().find(r => days >= r.days) ?? null;
};

export interface ReminderState {
  /** Reminders turned off for this person. */
  off?: boolean;
  /** You marked that you have made plans. */
  planned?: boolean;
}

const KEY = 'sync.planReminders.v1';

const read = (): Record<string, ReminderState> => {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
};

let state: Record<string, ReminderState> = typeof window === 'undefined' ? {} : read();
const listeners = new Set<() => void>();
const EMPTY: ReminderState = {};

export const setReminderState = (personId: string, patch: ReminderState) => {
  state = { ...state, [personId]: { ...state[personId], ...patch } };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage blocked: lasts until the page reloads.
  }
  listeners.forEach(l => l());
};

export const getReminderState = (personId: string): ReminderState => state[personId] ?? EMPTY;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const usePlanReminders = (personId: string | null) =>
  useSyncExternalStore(subscribe, () => (personId ? state[personId] ?? EMPTY : EMPTY));

/** Everyone's reminder settings, for lists such as the notifications bell. */
export const useAllPlanReminders = () => useSyncExternalStore(subscribe, () => state);

/** Reminders run unless turned off or plans are made. Turning them back on starts them again. */
export const remindersActive = (s: ReminderState) => !s.off && !s.planned;
