import { describe, expect, it } from 'vitest';
import { dueReminder, getReminderState, remindersActive, setReminderState } from '@/lib/planReminders';

describe('dueReminder', () => {
  const now = new Date(2026, 10, 27, 12);
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  it('waits 3 days, then shows the latest milestone reached', () => {
    expect(dueReminder(daysAgo(2), now)).toBeNull();
    expect(dueReminder(daysAgo(3), now)?.days).toBe(3);
    expect(dueReminder(daysAgo(8), now)?.days).toBe(7);
    expect(dueReminder(daysAgo(20), now)?.days).toBe(14);
    expect(dueReminder(daysAgo(45), now)?.days).toBe(30);
  });
});

describe('turning reminders off and on', () => {
  it('stops when turned off or plans are made, and starts again when turned back on', () => {
    expect(remindersActive(getReminderState('7'))).toBe(true);
    setReminderState('7', { off: true });
    expect(remindersActive(getReminderState('7'))).toBe(false);
    setReminderState('7', { off: false });
    expect(remindersActive(getReminderState('7'))).toBe(true);
    setReminderState('7', { planned: true });
    expect(remindersActive(getReminderState('7'))).toBe(false);
  });
});
