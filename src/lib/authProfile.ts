import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import {
  getUserProfile,
  saveUserProfile,
  getBackedUpProfile,
  isSampleProfile,
  SocialPreferences,
  SocialStyle,
  UserProfile,
} from '@/lib/userProfile';

/**
 * Social sign-in (Google, Apple, Microsoft) skips onboarding, so a brand-new
 * account has no profile yet. Build a starter one from what the provider shares.
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

type ProfileRow = {
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth: string | null;
  location: string;
  neighborhood: string;
  nationality: string;
  photo: string | null;
  interests: string[];
  social_preferences: Json | null;
  social_style: string | null;
  onboarded_at: string | null;
};

export const profileToRow = (userId: string, p: UserProfile) => ({
  id: userId,
  first_name: p.firstName,
  last_name: p.lastName,
  email: p.email,
  date_of_birth: p.dateOfBirth || null,
  location: p.location || 'Porto',
  neighborhood: p.neighborhood ?? '',
  nationality: p.nationality ?? '',
  photo: p.photo ?? null,
  interests: p.interests ?? [],
  social_preferences: (p.socialPreferences ?? null) as unknown as Json,
  social_style: p.socialStyle ?? null,
  onboarded_at: p.onboardedAt ?? null,
});

export const rowToProfile = (row: ProfileRow): UserProfile => ({
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  dateOfBirth: row.date_of_birth ?? '',
  location: row.location,
  neighborhood: row.neighborhood,
  nationality: row.nationality,
  photo: row.photo ?? undefined,
  interests: row.interests ?? [],
  socialPreferences: (row.social_preferences ?? undefined) as unknown as SocialPreferences | undefined,
  socialStyle: (row.social_style ?? undefined) as SocialStyle | undefined,
  onboardedAt: row.onboarded_at ?? undefined,
});

/** The profile saved with the account; null if none yet, undefined if it couldn't be read. */
export const fetchAccountProfile = async (userId: string): Promise<UserProfile | null | undefined> => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) {
    console.warn('[profiles] could not load account profile', error.message);
    return undefined;
  }
  return data ? rowToProfile(data) : null;
};

export const saveAccountProfile = async (userId: string, profile: UserProfile): Promise<boolean> => {
  const { error } = await supabase.from('profiles').upsert(profileToRow(userId, profile));
  if (error) {
    console.warn('[profiles] could not save account profile', error.message);
    return false;
  }
  return true;
};

const sameEmail = (a?: string | null, b?: string | null) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Picks the profile for a signed-in account, in this order:
 * 1. the copy saved with the account,
 * 2. a profile already on this device for the same email (saved to the account),
 * 3. the backup kept when this email last signed out here (saved to the account),
 * 4. a starter profile from the sign-in provider (saved to the account).
 */
export const syncProfileWithAccount = async (user: User): Promise<UserProfile> => {
  const announce = (p: UserProfile) => {
    saveUserProfile(p, { fromAccount: true });
    window.dispatchEvent(new Event('sync:profile-changed'));
    return p;
  };

  const remote = await fetchAccountProfile(user.id);
  if (remote) return announce(remote);

  const local = getUserProfile();
  const backup = getBackedUpProfile(user.email);
  const candidate =
    (local && sameEmail(local.email, user.email) && !isSampleProfile(local) && local) ||
    (backup && !isSampleProfile(backup) && backup) ||
    profileFromAuthUser(user);

  // Only write to the account when we know it has no profile (not on a read error).
  if (remote === null) await saveAccountProfile(user.id, candidate);
  return announce(candidate);
};

/** Session-level entry point used by AuthProfileSync. */
export const ensureProfileForSession = async (session: Session | null): Promise<boolean> => {
  if (!session?.user) return false;
  await syncProfileWithAccount(session.user);
  return true;
};
