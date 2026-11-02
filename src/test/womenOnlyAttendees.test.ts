import { describe, expect, it } from 'vitest';
import { rowToEvent } from '@/lib/liveEvents';
import { mockWomenParticipantIds } from '@/data/mockData';

const baseRow = {
  source: 'expat-girls-porto',
  source_event_id: 'x',
  source_url: 'https://example.com',
  title: 'Air UP',
  description: null,
  starts_at: '2026-11-14T10:00:00Z',
  tags: [],
};

describe('women-only attendee faces', () => {
  it('only shows women on women-only events', () => {
    for (let i = 0; i < 50; i++) {
      const event = rowToEvent({ ...baseRow, id: `event-${i}`, women_only: true } as never);
      expect(event.participants.length).toBeGreaterThan(0);
      for (const p of event.participants) expect(mockWomenParticipantIds).toContain(p.id);
    }
  });
});
