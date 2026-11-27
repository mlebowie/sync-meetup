import { describe, expect, it } from 'vitest';
import { isTestMode, lastTestMode, rememberTestMode } from '@/lib/testMode';

// Vitest runs in development mode, so test mode counts as switched on here; these check who may use it.
describe('isTestMode', () => {
  it('is on for an admin using the profile of the account they are signed in with', () => {
    expect(isTestMode({ isAdmin: true, sessionEmail: 'founder@example.test', profileEmail: 'Founder@Example.test ' })).toBe(true);
  });

  it('is off for an admin whose browser shows a different profile', () => {
    expect(isTestMode({ isAdmin: true, sessionEmail: 'founder@example.test', profileEmail: 'test.member@example.test' })).toBe(false);
  });

  it('is off for members who are not admins', () => {
    expect(isTestMode({ isAdmin: false, sessionEmail: 'member@example.test', profileEmail: 'member@example.test' })).toBe(false);
  });

  it('is off when signed out or without a profile', () => {
    expect(isTestMode({ isAdmin: false, sessionEmail: null, profileEmail: 'member@example.test' })).toBe(false);
    expect(isTestMode({ isAdmin: true, sessionEmail: 'founder@example.test', profileEmail: null })).toBe(false);
  });
});

describe('remembered test mode (while the admin check loads)', () => {
  it('is remembered for the same profile only', () => {
    rememberTestMode('Founder@Example.test', true);
    expect(lastTestMode('founder@example.test')).toBe(true);
    expect(lastTestMode('someone@example.test')).toBe(false);
    rememberTestMode('founder@example.test', false);
    expect(lastTestMode('founder@example.test')).toBe(false);
  });
});
