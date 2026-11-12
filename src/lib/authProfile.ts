import type { Session, User } from '@supabase/supabase-js';
import { getUserProfile, saveUserProfile, UserProfile } from '@/lib/userProfile';

/**
 * Social sign-in (Google, Apple, Microsoft) returns to the app with a session
 * but skips onboarding, so no local profile exists and the homepage would treat
 * the person as a guest. Build a starter profile from what the provider shares.
 */
export const profileFromAuthUser = (user: User): UserProfile => {
  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  const fullName = (meta.full_name || meta.name || '').trim();
  const [firstFromFull, ...restFromFull] = fullName.split(/\s+/).filter(Boolean);
  return {
    firstName: (meta.first_name || meta.given_name || firstFromFull || 'Friend').slice(0, 60),
    lastName: (meta.last_name || meta.family_name || restFromFull.join(' ')).slice(0, 60),
    email: (user.email ?? '').slice(0, 120),
    dateOfBirth: '',
    location: 'Porto',
    neighborhood: '',
    nationality: '',
    photo: meta.avatar_url || meta.picture || undefined,
    interests: [],
    onboardedAt: new Date().toISOString(),
  };
};

/** Creates a local profile for a signed-in account that doesn't have one yet. */
export const ensureProfileForSession = (session: Session | null): boolean => {
  if (!session?.user || getUserProfile()) return false;
  saveUserProfile(profileFromAuthUser(session.user));
  window.dispatchEvent(new Event('sync:profile-changed'));
  return true;
};
