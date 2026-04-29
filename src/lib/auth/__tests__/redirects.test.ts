import { describe, expect, it } from 'vitest';
import {
  getLoginRedirectPath,
  getProtectedRedirectTarget,
  getSafePostLoginRedirect,
} from '../redirects';

describe('auth redirect helpers', () => {
  it('preserves the protected path in the login redirect', () => {
    expect(getLoginRedirectPath('/upgrade')).toBe('/auth/login?next=%2Fupgrade');
    expect(getLoginRedirectPath('/upgrade', '?plan=charter')).toBe('/auth/login?next=%2Fupgrade%3Fplan%3Dcharter');
  });

  it('keeps upgrade as a valid post-login redirect for pre-onboarding users', () => {
    expect(getProtectedRedirectTarget('/upgrade')).toBe('/upgrade');
    expect(getSafePostLoginRedirect('/upgrade')).toBe('/upgrade');
  });

  it('rejects unsafe post-login redirect targets', () => {
    expect(getSafePostLoginRedirect(null)).toBe('/');
    expect(getSafePostLoginRedirect('upgrade')).toBe('/');
    expect(getSafePostLoginRedirect('//evil.example')).toBe('/');
  });
});
