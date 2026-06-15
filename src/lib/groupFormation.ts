import { Group, PastAttendance, TaggedConnection } from '@/types/event';

/**
 * Auto-form crew suggestions when:
 *  - 3+ users have repeatedly attended the same recurring series with the user, OR
 *  - 2+ users mutually tagged the user (and each other) after the same event.
 */
export function suggestGroups(
  history: PastAttendance[],
  tags: TaggedConnection[],
  mutualSet: Set<string>,
): Group[] {
  const groups: Group[] = [];

  // Series-based crews
  const seriesBuckets: Record<string, { title: string; coAttendees: Record<string, number> }> = {};
  history.forEach(h => {
    if (!h.seriesId) return;
    seriesBuckets[h.seriesId] ??= { title: h.title, coAttendees: {} };
    h.coAttendeeIds.forEach(id => {
      seriesBuckets[h.seriesId].coAttendees[id] = (seriesBuckets[h.seriesId].coAttendees[id] || 0) + 1;
    });
  });

  Object.entries(seriesBuckets).forEach(([seriesId, bucket]) => {
    const regulars = Object.entries(bucket.coAttendees)
      .filter(([, count]) => count >= 2)
      .map(([id]) => id);
    if (regulars.length >= 2) {
      groups.push({
        id: `series-${seriesId}`,
        name: `${bucket.title} regulars`,
        reason: `You + ${regulars.length} people keep showing up to ${bucket.title}`,
        memberIds: regulars,
        seriesId,
      });
    }
  });

  // Tag-based crews — people the user tagged who also tagged back
  const mutualTagged = tags.filter(t => mutualSet.has(t.participantId)).map(t => t.participantId);
  const unique = Array.from(new Set(mutualTagged));
  if (unique.length >= 2) {
    groups.push({
      id: 'tagged-crew',
      name: 'Your tagged crew',
      reason: 'People you clicked with who also tagged you back',
      memberIds: unique,
    });
  }

  return groups;
}
