import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';

// In-memory stand-in for the profiles table.
const db: { row: Record<string, unknown> | null; failRead: boolean; upserts: number } = {
  row: null,
  failRead: false,
  upserts: 0,
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () =>
            db.failRead ? { data: null, error: { message: 'relation does not exist' } } : { data: db.row, error: null },
        }),
      }),
      upsert: async (row: Record<string, unknown>) => {
        db.upserts += 1;
        db.row = row;
        return { error: null };
      },
    }),
  },
}));

import { profileFromAuthUser, profileToRow, syncProfileWithAccount } from '@/lib/authProfile';
import {
  getUserProfile,
  saveUserProfile,
  clearUserProfile,
  backupUserProfile,
  DEFAULT_PROFILE,
  UserProfile,
} from '@/lib/userProfile';

const googleUser = {
  id: 'u1',
  email: 'ana@example.com',
  user_metadata: { full_name: 'Ana Maria Costa', avatar_url: 'https://example.com/a.jpg' },
} as unknown as User;

const anaProfile: UserProfile = {
  ...DEFAULT_PROFILE,
  firstName: 'Ana',
  lastName: 'Costa',
  email: 'ana@example.com',
  interests: ['sports', 'health-wellness', 'dance'],
};

beforeEach(() => {
  window.localStorage.clear();
  db.row = null;
  db.failRead = false;
  db.upserts = 0;
});

describe('profileFromAuthUser', () => {
  it('splits the Google full name and keeps email and photo', () => {
    const p = profileFromAuthUser(googleUser);
    expect(p.firstName).toBe('Ana');
    expect(p.lastName).toBe('Maria Costa');
    expect(p.email).toBe('ana@example.com');
    expect(p.photo).toBe('https://example.com/a.jpg');
    expect(p.interests).toEqual([]);
  });
});

describe('syncProfileWithAccount', () => {
  it('loads the profile saved with the account, interests included', async () => {
    db.row = profileToRow('u1', anaProfile);
    const p = await syncProfileWithAccount(googleUser);
    expect(p.interests).toEqual(anaProfile.interests);
    expect(getUserProfile()?.interests).toEqual(anaProfile.interests);
    expect(db.upserts).toBe(0);
  });

  it('saves a profile already on this device to the account', async () => {
    saveUserProfile(anaProfile, { fromAccount: true });
    await syncProfileWithAccount(googleUser);
    expect(db.upserts).toBe(1);
    expect(db.row?.interests).toEqual(anaProfile.interests);
  });

  it('restores the sign-out backup when the account has no copy', async () => {
    backupUserProfile(anaProfile);
    clearUserProfile();
    const p = await syncProfileWithAccount(googleUser);
    expect(p.interests).toEqual(anaProfile.interests);
    expect(db.row?.interests).toEqual(anaProfile.interests);
  });

  it('never saves the sample profile as someone\'s own', async () => {
    saveUserProfile({ ...DEFAULT_PROFILE, email: 'ana@example.com' }, { fromAccount: true });
    const p = await syncProfileWithAccount(googleUser);
    expect(p.firstName).toBe('Ana');
    expect(p.interests).toEqual([]);
  });

  it('does not overwrite the account when it could not be read', async () => {
    db.failRead = true;
    await syncProfileWithAccount(googleUser);
    expect(db.upserts).toBe(0);
    expect(getUserProfile()?.email).toBe('ana@example.com');
  });
});
