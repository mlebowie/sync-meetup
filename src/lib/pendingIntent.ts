/**
 * Remembers what a logged-out visitor was trying to do (register, get tickets,
 * join a waitlist) while they sign up, so the app can finish it afterwards —
 * including across the Google sign-in redirect.
 */
export type IntentAction = 'register' | 'tickets' | 'waitlist';

export interface PendingIntent {
  eventId: string;
  eventTitle: string;
  action: IntentAction;
  at: number;
}

const KEY = 'sync.pendingIntent.v1';
const MAX_AGE_MS = 60 * 60 * 1000; // an hour is plenty to sign up

export function setPendingIntent(intent: Omit<PendingIntent, 'at'>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...intent, at: Date.now() }));
  } catch {
    /* storage unavailable */
  }
}

export function getPendingIntent(): PendingIntent | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const intent = JSON.parse(raw) as PendingIntent;
    if (!intent?.eventId || Date.now() - intent.at > MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return intent;
  } catch {
    return null;
  }
}

export function clearPendingIntent() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}

/**
 * Hands the intent to exactly one caller (several cards can show the same event),
 * and clears it so it never runs twice.
 */
export function takePendingIntent(eventId: string): PendingIntent | null {
  const intent = getPendingIntent();
  if (!intent || intent.eventId !== eventId) return null;
  clearPendingIntent();
  return intent;
}
