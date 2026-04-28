import { describe, expect, it } from 'vitest';

import {
  buildPasswordResetRedirectUrl,
  classifyForgotPasswordError,
  classifyPasswordUpdateError,
  resolveRecoverySessionState,
} from '../password-reset-flow';

describe('buildPasswordResetRedirectUrl', () => {
  it('builds the reset route from a normal origin', () => {
    expect(buildPasswordResetRedirectUrl('https://sos.app')).toBe('https://sos.app/auth/reset-password');
  });

  it('avoids double slashes when the origin already ends with one', () => {
    expect(buildPasswordResetRedirectUrl('https://sos.app/')).toBe('https://sos.app/auth/reset-password');
  });
});

describe('classifyForgotPasswordError', () => {
  it('returns the calm rate-limit copy for 429s', () => {
    expect(classifyForgotPasswordError({ status: 429, message: 'Too many requests' }))
      .toBe('Too many requests. Please wait a few minutes before trying again.');
  });

  it('returns the generic copy for non-rate-limit errors', () => {
    expect(classifyForgotPasswordError({ status: 500, message: 'boom' }))
      .toBe('Something went wrong. Please try again.');
  });
});

describe('resolveRecoverySessionState', () => {
  it('treats PASSWORD_RECOVERY as ready even before a session fetch settles', () => {
    expect(resolveRecoverySessionState({ authEvent: 'PASSWORD_RECOVERY', hasSession: false })).toBe('ready');
  });

  it('marks exchange failures as expired', () => {
    expect(resolveRecoverySessionState({ exchangeError: true, hasSession: false })).toBe('expired');
  });

  it('marks missing sessions as expired', () => {
    expect(resolveRecoverySessionState({ hasSession: false })).toBe('expired');
  });

  it('allows a healthy recovery session through', () => {
    expect(resolveRecoverySessionState({ hasSession: true })).toBe('ready');
  });
});

describe('classifyPasswordUpdateError', () => {
  it('identifies weak-password errors', () => {
    expect(classifyPasswordUpdateError('Password does not meet policy requirements')).toBe('weak');
  });

  it('identifies expired or already-used recovery links', () => {
    expect(classifyPasswordUpdateError('Recovery token already used')).toBe('expired');
  });

  it('falls back to generic for unknown errors', () => {
    expect(classifyPasswordUpdateError('unexpected')).toBe('generic');
  });
});
