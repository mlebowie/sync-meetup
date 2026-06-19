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
  { id: 'religion-spirituality', label: 'Religion & spirituality', icon: '🕊️', keywords: ['spirituality', 'religion', 'meditation'] },
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
