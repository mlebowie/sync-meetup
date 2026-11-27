/**
 * Test mode: shortcuts for trying flows without waiting for real time to pass.
 *
 * Only for admins: it runs when the signed-in account has the admin role in the database AND the
 * app profile in use belongs to that same account (so a local test profile in an admin's browser
 * doesn't count). On top of that it must be switched on: automatically in local development, or
 * with `?test=on` in the address bar elsewhere (`?test=off` to stop; remembered in this browser).
 *
 * What it does today:
 * - 10 seconds after you register for an event, a "How was it?" notification arrives that opens
 *   the post-event rating and tagging steps (any event, whatever its date).
 * - Everyone you tag tags you back, so each tag becomes a connection and unlocks a conversation.
 * - Your profile starts with a few demo connections (DEMO_CONNECTION_TAGS) and the two past events
 *   where you met them (DEMO_PAST_ATTENDANCE), so event cards show "Familiar faces".
 */

const KEY = 'sync.testMode.v1';

export const TEST_RECAP_DELAY_MS = 10_000;

/**
 * Two past events an admin "attended" in test mode (where the demo connections were met). These
 * attendees (picked because they appear on about a third of events) count as familiar faces.
 */
export const DEMO_PAST_ATTENDANCE: {
  eventId: string; title: string; category: string; daysAgo: number; coAttendeeIds: string[]; location: string;
}[] = [
  { eventId: 'test-demo-brunch', title: 'Sunday Brunch Club', category: 'Dining & cooking', daysAgo: 5, coAttendeeIds: ['12', '13'], location: 'Bonfim, Porto' },
  { eventId: 'test-demo-trail', title: 'Saturday Trail Run', category: 'Sports', daysAgo: 3, coAttendeeIds: ['3', '11'], location: 'Parque da Cidade, Porto' },
];

/** Demo connections an admin starts with in test mode: people met at a past event who tagged back. */
export const DEMO_CONNECTION_TAGS: { participantId: string; eventId: string; eventTitle: string; eventCategory: string; daysAgo: number }[] = [
  { participantId: '7', eventId: 'test-demo-brunch', eventTitle: 'Sunday Brunch Club', eventCategory: 'Dining & cooking', daysAgo: 5 },
  { participantId: '9', eventId: 'test-demo-brunch', eventTitle: 'Sunday Brunch Club', eventCategory: 'Dining & cooking', daysAgo: 5 },
  { participantId: '1', eventId: 'test-demo-trail', eventTitle: 'Saturday Trail Run', eventCategory: 'Sports', daysAgo: 3 },
];

const readFlagFromUrl = () => {
  if (typeof window === 'undefined') return;
  try {
    const value = new URLSearchParams(window.location.search).get('test');
    if (value === 'on') window.localStorage.setItem(KEY, '1');
    if (value === 'off') window.localStorage.removeItem(KEY);
  } catch {
    // Storage blocked (private mode): test mode simply stays off.
  }
};

readFlagFromUrl();

/** Switched on for this browser: always in local development, otherwise via `?test=on`. */
const isSwitchedOn = (): boolean => {
  if (import.meta.env.DEV) return true;
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

export interface TestModeAccess {
  /** The signed-in account has the admin role. */
  isAdmin: boolean;
  /** Email of the signed-in account. */
  sessionEmail: string | null;
  /** Email on the app profile currently in use. */
  profileEmail: string | null;
}

/** Admin, using their own profile, with test mode switched on. */
export const isTestMode = ({ isAdmin, sessionEmail, profileEmail }: TestModeAccess): boolean =>
  isAdmin &&
  !!sessionEmail &&
  !!profileEmail &&
  sessionEmail.trim().toLowerCase() === profileEmail.trim().toLowerCase() &&
  isSwitchedOn();

// --- Test recaps: scheduled when you register, collected here, shown by the notifications bell. ---

export interface TestRecap {
  eventId: string;
  at: number;
}

let recaps: TestRecap[] = [];
const listeners = new Set<() => void>();

/** After TEST_RECAP_DELAY_MS, add a recap for this event and tell anyone listening (the bell, a toast). */
export const scheduleTestRecap = (eventId: string, access: TestModeAccess, onArrive?: () => void) => {
  if (!isTestMode(access)) return;
  window.setTimeout(() => {
    recaps = [...recaps.filter(r => r.eventId !== eventId), { eventId, at: Date.now() }];
    listeners.forEach(listener => listener());
    onArrive?.();
  }, TEST_RECAP_DELAY_MS);
};

export const getTestRecaps = () => recaps;

export const subscribeTestRecaps = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
