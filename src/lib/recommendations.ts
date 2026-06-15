import { Event, PastAttendance } from '@/types/event';

interface ScoreContext {
  history: PastAttendance[];
  seriesCount: (seriesId?: string) => number;
  crossedPathsWith: (id: string) => number;
  categoryAffinity: () => Record<string, number>;
}

export interface RankedEvent {
  event: Event;
  score: number;
  reasons: string[];
}

/**
 * Rank events for the current user using activity history signals:
 *  1. Series the user already attends (habit reinforcement) — heavy weight
 *  2. Events featuring attendees the user keeps crossing paths with
 *  3. Category match against the user's past attendance
 */
export function rankEvents(events: Event[], ctx: ScoreContext): RankedEvent[] {
  const affinity = ctx.categoryAffinity();
  const now = Date.now();

  return events
    .filter(e => e.date.getTime() >= now - 1000 * 60 * 60) // upcoming only
    .map(event => {
      const reasons: string[] = [];
      let score = 0;

      const sCount = ctx.seriesCount(event.seriesId);
      if (sCount > 0) {
        score += 50 + sCount * 10;
        reasons.push(`${ordinal(sCount + 1)} time for you`);
      } else if (event.recurrence && event.recurrence !== 'one-off') {
        score += 8;
        reasons.push('Recurring crew — easy to repeat');
      }

      const familiar = event.participants.filter(p => ctx.crossedPathsWith(p.id) > 0);
      if (familiar.length > 0) {
        const total = familiar.reduce((acc, p) => acc + ctx.crossedPathsWith(p.id), 0);
        score += 12 * familiar.length + total * 2;
        reasons.push(`${familiar.length} ${familiar.length === 1 ? 'person' : 'people'} you keep crossing paths with`);
      }

      const cat = affinity[event.category] || 0;
      if (cat > 0) {
        score += cat * 4;
        reasons.push(`Matches your ${event.category.toLowerCase()} pattern`);
      }

      return { event, score, reasons };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
