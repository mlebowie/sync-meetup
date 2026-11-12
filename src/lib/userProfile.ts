import defaultProfilePhoto from '@/assets/default-profile.jpg';

export const ONBOARDING_INTERESTS: { id: string; label: string; icon: string; keywords: string[] }[] = [
  { id: 'sports', label: 'Sports', icon: '⚽', keywords: ['running', 'football', 'padel', 'surf', 'climbing', 'sports'] },
  { id: 'dance', label: 'Dance', icon: '💃', keywords: ['dance', 'dancing', 'salsa', 'bachata', 'kizomba', 'tango'] },
  { id: 'social-networking', label: 'Social networking', icon: '🤝', keywords: ['social', 'brunch', 'walk', 'beer', 'networking'] },
  { id: 'dining-cooking', label: 'Dining & cooking', icon: '🍽️', keywords: ['brunch', 'food', 'dinner', 'drinks', 'cooking'] },
  { id: 'popup-events', label: 'Pop-up events', icon: '✨', keywords: ['pop-up', 'popup'] },
  { id: 'outdoors', label: 'Outdoors activities', icon: '🌲', keywords: ['outdoors', 'trail', 'surf', 'walk', 'nature'] },
  { id: 'tech-ai', label: 'Tech & AI', icon: '💻', keywords: ['tech', 'ai', 'founders', 'startup'] },
  { id: 'arts-theatre', label: 'Arts & culture', icon: '🎭', keywords: ['arts', 'theatre', 'creative', 'photography', 'books', 'reading'] },
  { id: 'games', label: 'Games', icon: '🎮', keywords: ['games', 'gaming'] },
  { id: 'health-wellness', label: 'Health & wellness', icon: '🧘', keywords: ['wellness', 'yoga', 'mindfulness', 'health'] },
  { id: 'religion', label: 'Religion', icon: '🕊️', keywords: ['religion', 'faith', 'church'] },
  { id: 'spirituality', label: 'Spirituality', icon: '🌙', keywords: ['spirituality', 'meditation', 'mindfulness'] },
  { id: 'music-live', label: 'Music & live events', icon: '🎵', keywords: ['music', 'concert', 'live', 'dj', 'jazz'] },
  { id: 'professional', label: 'Professional development', icon: '📈', keywords: ['networking', 'founders', 'professional', 'career'] },
  { id: 'education', label: 'Education', icon: '🎓', keywords: ['learning', 'education', 'languages', 'workshop'] },
  { id: 'languages', label: 'Languages', icon: '🗣️', keywords: ['languages', 'language'] },
  { id: 'cultural-exchange', label: 'Cultural exchange', icon: '🌍', keywords: ['culture', 'cultural', 'languages'] },
  { id: 'charity', label: 'Charity & non-profit', icon: '❤️', keywords: ['charity', 'volunteer', 'non-profit'] },
];

export const INTEREST_GROUPS: { label: string; interestIds: string[] }[] = [
  { label: 'Outdoors & movement', interestIds: ['sports', 'dance', 'outdoors', 'health-wellness'] },
  { label: 'Food & social', interestIds: ['social-networking', 'dining-cooking', 'popup-events'] },
  { label: 'Arts & culture', interestIds: ['arts-theatre', 'music-live', 'cultural-exchange', 'games'] },
  { label: 'Learning & professional', interestIds: ['tech-ai', 'professional', 'education', 'languages'] },
  { label: 'Community & meaning', interestIds: ['charity', 'religion', 'spirituality'] },
];

export type SocialStyle =
  | 'weekend-explorer'
  | 'community-builder'
  | 'selective-socialiser'
  | 'new-in-town-nomad';

export interface SocialPreferences {
  planning: 'spontaneous' | 'planned';
  groupSetting: 'intimate' | 'lively';
  connectionGoal: 'familiar' | 'new-people';
}

export const SOCIAL_STYLE_DETAILS: Record<SocialStyle, { name: string; description: string }> = {
  'weekend-explorer': {
    name: 'The Weekend Explorer',
    description: 'You like lively plans with room for spontaneity. We’ll prioritise energetic, easy-to-join events.',
  },
  'community-builder': {
    name: 'The Community Builder',
    description: 'You value familiar faces and plans worth returning to. We’ll prioritise recurring, social events.',
  },
  'selective-socialiser': {
    name: 'The Selective Socialiser',
    description: 'You prefer considered plans and smaller groups. We’ll prioritise relaxed events with space to connect.',
  },
  'new-in-town-nomad': {
    name: 'The New-in-Town Nomad',
    description: 'You are open to fresh faces and flexible plans. We’ll prioritise welcoming events built for meeting people.',
  },
};

export const determineSocialStyle = (preferences: SocialPreferences): SocialStyle => {
  if (preferences.planning === 'planned' && preferences.groupSetting === 'intimate') return 'selective-socialiser';
  if (preferences.planning === 'planned' && preferences.connectionGoal === 'familiar') return 'community-builder';
  if (preferences.planning === 'spontaneous' && preferences.connectionGoal === 'new-people') return 'new-in-town-nomad';
  if (preferences.groupSetting === 'lively') return 'weekend-explorer';
  return preferences.connectionGoal === 'familiar' ? 'community-builder' : 'new-in-town-nomad';
};

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
  socialPreferences?: SocialPreferences;
  socialStyle?: SocialStyle;
  /** ISO timestamp of account creation — used to ignore seeded demo history. */
  onboardedAt?: string;
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

/**
 * Saves the profile on this device. Unless it came from the account itself,
 * also fires `sync:profile-saved` so AuthProfileSync can save it to the account.
 */
export const saveUserProfile = (profile: UserProfile, options: { fromAccount?: boolean } = {}) => {
  window.localStorage.setItem(KEY, JSON.stringify(profile));
  if (!options.fromAccount && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new Event('sync:profile-saved'));
  }
};

/** Signs the profile out of this device. The account copy (and a local backup) stay. */
export const clearUserProfile = () => {
  window.localStorage.removeItem(KEY);
};

// Per-email backup kept on sign-out, so a profile is never lost even if the
// account copy couldn't be saved (offline, or before the profiles table existed).
const BACKUP_KEY = 'sync.savedProfiles.v1';

const readBackups = (): Record<string, UserProfile> => {
  try {
    return JSON.parse(window.localStorage.getItem(BACKUP_KEY) ?? '{}') as Record<string, UserProfile>;
  } catch {
    return {};
  }
};

export const backupUserProfile = (profile: UserProfile) => {
  if (!profile.email) return;
  try {
    const backups = readBackups();
    backups[profile.email.trim().toLowerCase()] = profile;
    window.localStorage.setItem(BACKUP_KEY, JSON.stringify(backups));
  } catch {
    // Storage full: the account copy still holds the profile.
  }
};

export const getBackedUpProfile = (email: string | undefined | null): UserProfile | null => {
  if (!email) return null;
  return readBackups()[email.trim().toLowerCase()] ?? null;
};

/** True for the built-in sample profile, which must never be saved as someone's own. */
export const isSampleProfile = (profile: UserProfile) =>
  profile.firstName === DEFAULT_PROFILE.firstName && profile.lastName === DEFAULT_PROFILE.lastName;

export const getInterestKeywords = (interestIds: string[]): string[] =>
  interestIds.flatMap(id => {
    const interest = ONBOARDING_INTERESTS.find(i => i.id === id);
    // The label itself is the event category, so it always matches its own filter.
    return interest ? [interest.label, ...interest.keywords] : [];
  });

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
  photo: defaultProfilePhoto,
  interests: ['social-networking', 'dining-cooking', 'arts-theatre', 'tech-ai', 'music-live', 'education'],
  socialPreferences: {
    planning: 'planned',
    groupSetting: 'lively',
    connectionGoal: 'familiar',
  },
  socialStyle: 'community-builder',
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
