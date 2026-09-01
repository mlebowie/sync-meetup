import { PastAttendance } from '@/types/event';
import { UserProfile, matchesInterests } from '@/lib/userProfile';

/**
 * Picks the event a user should be asked to reflect on.
 *
 * Rules:
 * - Brand-new users (profile has `onboardedAt`) are never asked to reflect on
 *   seeded/demo history — only on events they attended after signing up.
 * - Among eligible events, prefer one that matches the user's selected
 *   interests instead of just the newest generic entry.
 */
export const getReflectionCandidate = (
  history: PastAttendance[],
  profile: UserProfile | null,
): PastAttendance | null => {
  if (!profile) return null;

  let eligible = history;
  if (profile.onboardedAt) {
    const signup = new Date(profile.onboardedAt).getTime();
    eligible = history.filter(h => new Date(h.date).getTime() >= signup);
  }
  if (eligible.length === 0) return null;

  const byRecency = [...eligible].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const interests = profile.interests ?? [];
  const relevant = byRecency.find(h =>
    matchesInterests({ category: h.category, tags: [h.title] }, interests),
  );

  return relevant ?? byRecency[0];
};
