import { ChatMessage, Event } from '@/types/event';

export const icebreakersByCategory: Record<string, string> = {
  Sports: 'What’s the last sport that left you sore but smiling?',
  Wellness: 'Share one tiny ritual that resets your day.',
  Networking: 'What are you building or curious about right now?',
  Social: 'What’s your go-to “new in town” conversation starter?',
  Dance: 'What song instantly gets you moving?',
  Arts: 'Drop a photo, lyric or quote that defines your week.',
  'Food & Drinks': 'What’s the best bite you’ve had in Porto so far?',
  Outdoors: 'Sunrise or sunset — and where’s your favourite spot for it?',
};

export const getIcebreaker = (event: Event) =>
  icebreakersByCategory[event.category] || 'Introduce yourself in one sentence!';

export const seedGroupChat = (event: Event): ChatMessage[] => {
  const icebreaker = getIcebreaker(event);
  const org = event.organizer;
  return [
    {
      id: `seed-${event.id}`,
      authorId: 'sync-bot',
      authorName: 'Sync',
      authorAvatar: '',
      content: `🧊 Icebreaker for "${event.title}": ${icebreaker}`,
      type: 'text',
      timestamp: new Date(event.date.getTime() - 24 * 60 * 60 * 1000),
    },
    ...(org
      ? [{
          id: `seed-${event.id}-host`,
          authorId: org.id,
          authorName: `${org.name} (host)`,
          authorAvatar: org.avatar || '',
          content: `Hi all — ${org.name} here, hosting "${event.title}". Drop any questions about timing, location or what to bring right here and I'll answer the whole group.`,
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
        ? 'Hey everyone 👋 super excited for this!'
        : 'Same! First time joining — see you there.',
      type: 'text' as const,
      timestamp: new Date(event.date.getTime() - 23 * 60 * 60 * 1000 + i * 60000),
    })),
  ];
};
