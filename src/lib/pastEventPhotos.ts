import { currentUserHistory, mockParticipants } from '@/data/mockData';
import type { EventPhoto } from '@/context/EventMediaContext';

/** Representative imagery per recurring series, used for seeded attendee photos and banners. */
export const SERIES_PHOTOS: Record<string, string[]> = {
  'trail-run': [
    'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=900&h=600&fit=crop',
    'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=900&h=600&fit=crop',
    'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=900&h=600&fit=crop',
  ],
  padel: [
    'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=900&h=600&fit=crop',
    'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=900&h=600&fit=crop',
  ],
  'brunch-club': [
    'https://images.unsplash.com/photo-1533920379810-6bedac9e31df?w=900&h=600&fit=crop',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&h=600&fit=crop',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900&h=600&fit=crop',
  ],
  'founders-mixer': [
    'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=900&h=600&fit=crop',
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=900&h=600&fit=crop',
  ],
  'sunset-walk': [
    'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=900&h=600&fit=crop',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&h=600&fit=crop',
  ],
  climbing: [
    'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=900&h=600&fit=crop',
    'https://images.unsplash.com/photo-1516592066400-86808cf1e884?w=900&h=600&fit=crop',
  ],
};

const DEFAULT_PHOTOS = [
  'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=900&h=600&fit=crop',
  'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=900&h=600&fit=crop',
];

export const bannerForPastEvent = (seriesId?: string) =>
  (seriesId && SERIES_PHOTOS[seriesId]?.[0]) || DEFAULT_PHOTOS[0];

const CAPTIONS = [
  'Group shot before we started 🙌',
  'Selfie with the crew',
  'Post-event coffee run',
  'Best part of the evening',
  'Made it to the end!',
];

/**
 * Attendee-uploaded photos for events the user already attended, so the recap
 * view has real content to like on first visit.
 */
export const buildSeedPastEventPhotos = (): EventPhoto[] => {
  const out: EventPhoto[] = [];
  currentUserHistory.forEach((h, hi) => {
    const urls = (h.seriesId && SERIES_PHOTOS[h.seriesId]) || DEFAULT_PHOTOS;
    const owners = h.coAttendeeIds
      .map(id => mockParticipants.find(p => p.id === id))
      .filter(Boolean)
      .slice(0, urls.length);
    owners.forEach((owner, i) => {
      out.push({
        id: `seed-${h.eventId}-${i}`,
        eventId: h.eventId,
        url: urls[i % urls.length],
        caption: CAPTIONS[(hi + i) % CAPTIONS.length],
        ownerId: owner!.id,
        ownerName: owner!.name,
        ownerAvatar: owner!.avatar,
        likes: ((hi * 3 + i * 7) % 9) + 2,
        likedByMe: false,
        createdAt: new Date(h.date.getTime() + (i + 1) * 3600_000).toISOString(),
      });
    });
  });
  return out;
};
