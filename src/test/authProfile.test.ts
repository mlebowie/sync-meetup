import { describe, it, expect, beforeEach } from 'vitest';
import type { Session, User } from '@supabase/supabase-js';
import { profileFromAuthUser, ensureProfileForSession } from '@/lib/authProfile';
import { getUserProfile, saveUserProfile, clearUserProfile, DEFAULT_PROFILE } from '@/lib/userProfile';

const googleUser = {
  id: 'u1',
  email: 'ana@example.com',
  user_metadata: { full_name: 'Ana Maria Costa', avatar_url: 'https://example.com/a.jpg' },
} as unknown as User;

describe('profileFromAuthUser', () => {
  it('splits the Google full name and keeps email and photo', () => {
    const p = profileFromAuthUser(googleUser);
    expect(p.firstName).toBe('Ana');
    expect(p.lastName).toBe('Maria Costa');
    expect(p.email).toBe('ana@example.com');
    expect(p.photo).toBe('https://example.com/a.jpg');
    expect(p.interests).toEqual([]);
  });

  it('prefers given and family names when the provider sends them', () => {
    const p = profileFromAuthUser({
      ...googleUser,
      user_metadata: { full_name: 'X Y', given_name: 'Emilie', family_name: 'W' },
    } as unknown as User);
    expect(p.firstName).toBe('Emilie');
    expect(p.lastName).toBe('W');
  });
});

describe('ensureProfileForSession', () => {
  beforeEach(() => clearUserProfile());

  it('creates a profile for a signed-in account without one', () => {
    expect(ensureProfileForSession({ user: googleUser } as Session)).toBe(true);
    expect(getUserProfile()?.email).toBe('ana@example.com');
  });

  it('leaves an existing profile alone', () => {
    saveUserProfile(DEFAULT_PROFILE);
    expect(ensureProfileForSession({ user: googleUser } as Session)).toBe(false);
    expect(getUserProfile()?.firstName).toBe(DEFAULT_PROFILE.firstName);
  });

  it('does nothing when signed out', () => {
    expect(ensureProfileForSession(null)).toBe(false);
    expect(getUserProfile()).toBeNull();
  });
});
