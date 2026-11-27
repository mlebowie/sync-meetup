import { ChatMessage, Event } from '@/types/event';

// Keyed by the event categories (the onboarding interests); older labels kept for older events.
export const icebreakersByCategory: Record<string, string> = {
  Sports: 'What’s the last sport that left you sore but smiling?',
  'Health & wellness': 'Share one tiny ritual that resets your day.',
  'Professional development': 'What are you building or curious about right now?',
  'Tech & AI': 'What are you building or curious about right now?',
  'Social networking': 'What’s your go-to “new in town” conversation starter?',
  Dance: 'What song instantly gets you moving?',
  'Arts & culture': 'Drop a photo, lyric or quote that defines your week.',
  'Dining & cooking': 'What’s the best bite you’ve had in Porto so far?',
  'Outdoors activities': 'Sunrise or sunset, and where’s your favourite spot for it?',
  Wellness: 'Share one tiny ritual that resets your day.',
  Networking: 'What are you building or curious about right now?',
  Social: 'What’s your go-to “new in town” conversation starter?',
  Arts: 'Drop a photo, lyric or quote that defines your week.',
  'Food & Drinks': 'What’s the best bite you’ve had in Porto so far?',
  Outdoors: 'Sunrise or sunset, and where’s your favourite spot for it?',
};

export const getIcebreaker = (event: Event) =>
  icebreakersByCategory[event.category] || 'Introduce yourself in one sentence.';

export const seedGroupChat = (event: Event): ChatMessage[] => {
  // The icebreaker is pinned at the top of the chat, so it isn't repeated as a message.
  const org = event.organizer;
  return [
    ...(org
      ? [{
          id: `seed-${event.id}-host`,
          authorId: org.id,
          authorName: `${org.name} (host)`,
          authorAvatar: org.avatar || '',
          content: `Hi all, ${org.name} here, hosting "${event.title}". Drop any questions about timing, location or what to bring right here and I'll answer the whole group.`,
          type: 'text' as const,
          timestamp: new Date(event.date.getTime() - 23.5 * 60 * 60 * 1000),
        }]
      : []),
    ...event.participants.slice(0, 2).map((p, i) => ({
      id: `seed-${event.id}-${p.id}`,
      authorId: p.id,
      authorName: p.name,
      authorAvatar: p.avatar,
      content: i === 0
        ? 'Hi everyone, really looking forward to this.'
        : 'Same here. First time joining, see you there.',
      type: 'text' as const,
      timestamp: new Date(event.date.getTime() - 23 * 60 * 60 * 1000 + i * 60000),
    })),
  ];
};
