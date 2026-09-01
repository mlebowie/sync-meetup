export const ONBOARDING_INTERESTS: { id: string; label: string; icon: string; keywords: string[] }[] = [
  { id: 'sports', label: 'Sports', icon: '⚽', keywords: ['running', 'football', 'padel', 'surf', 'climbing', 'sports'] },
  { id: 'social-networking', label: 'Social networking', icon: '🤝', keywords: ['social', 'brunch', 'walk', 'beer', 'networking'] },
  { id: 'dining-cooking', label: 'Dining & cooking', icon: '🍽️', keywords: ['brunch', 'food', 'dinner', 'drinks', 'cooking'] },
  { id: 'popup-events', label: 'Pop-up events', icon: '✨', keywords: ['pop-up', 'popup'] },
  { id: 'outdoors', label: 'Outdoors activities', icon: '🌲', keywords: ['outdoors', 'trail', 'surf', 'walk', 'nature'] },
  { id: 'tech-ai', label: 'Tech & AI', icon: '💻', keywords: ['tech', 'ai', 'founders', 'startup'] },
  { id: 'arts-theatre', label: 'Arts & theatre', icon: '🎭', keywords: ['arts', 'theatre', 'creative', 'photography'] },
  { id: 'games', label: 'Games', icon: '🎮', keywords: ['games', 'gaming'] },
  { id: 'health-wellness', label: 'Health & wellness', icon: '🧘', keywords: ['wellness', 'yoga', 'mindfulness', 'health'] },
  { id: 'religion', label: 'Religion', icon: '🕊️', keywords: ['religion', 'faith', 'church'] },
  { id: 'spirituality', label: 'Spirituality', icon: '🌙', keywords: ['spirituality', 'meditation', 'mindfulness'] },
  { id: 'music-live', label: 'Music & live events', icon: '🎵', keywords: ['music', 'salsa', 'dancing', 'concert', 'live'] },
  { id: 'professional', label: 'Professional development', icon: '📈', keywords: ['networking', 'founders', 'professional', 'career'] },
  { id: 'education', label: 'Education', icon: '🎓', keywords: ['learning', 'education', 'languages', 'workshop'] },
  { id: 'languages', label: 'Languages', icon: '🗣️', keywords: ['languages', 'language'] },
  { id: 'cultural-exchange', label: 'Cultural exchange', icon: '🌍', keywords: ['culture', 'cultural', 'languages'] },
  { id: 'charity', label: 'Charity & non-profit', icon: '❤️', keywords: ['charity', 'volunteer', 'non-profit'] },
];

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  location: string;
  neighborhood: string;
  nationality: string;
  photo?: string; // data URL
  interests: string[]; // ids from ONBOARDING_INTERESTS
}

const KEY = 'sync.userProfile.v1';

export const getUserProfile = (): UserProfile | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
};

export const saveUserProfile = (profile: UserProfile) => {
  window.localStorage.setItem(KEY, JSON.stringify(profile));
};

export const clearUserProfile = () => {
  window.localStorage.removeItem(KEY);
};

export const getInterestKeywords = (interestIds: string[]): string[] =>
  interestIds.flatMap(id => ONBOARDING_INTERESTS.find(i => i.id === id)?.keywords ?? []);

export const calculateAge = (dateOfBirth: string): number => {
  const birth = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

export const DEFAULT_PROFILE: UserProfile = {
  firstName: 'Thandiwe',
  lastName: 'Nkosi',
  email: 'thandiwe.nkosi@example.com',
  dateOfBirth: '1995-08-14',
  location: 'Porto',
  neighborhood: 'Cedofeita',
  nationality: 'South African',
  photo: '/__l5e/assets-v1/a4f70df6-c027-49e5-a43d-1b0852f12c3e/default-profile.jpg',
  interests: ['social-networking', 'dining-cooking', 'arts-theatre', 'tech-ai', 'music-live', 'education'],
};

/** True when an event's category/tags match any of the user's selected interests. */
export const matchesInterests = (
  event: { category: string; tags: string[] },
  interestIds: string[],
): boolean => {
  if (interestIds.length === 0) return true;
  const keywords = getInterestKeywords(interestIds).map(k => k.toLowerCase());
  if (keywords.length === 0) return true;
  const blob = [event.category, ...event.tags].join(' ').toLowerCase();
  return keywords.some(k => blob.includes(k));
};
