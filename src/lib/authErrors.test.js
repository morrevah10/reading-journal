import { describe, expect, it } from 'vitest';
import { authErrorCode } from './authErrors';

describe('authErrorCode', () => {
  it('returns the Firebase error code', () => {
    expect(authErrorCode({ code: 'auth/popup-blocked', name: 'FirebaseError' })).toBe('auth/popup-blocked');
  });

  it('falls back to a meaningful error name', () => {
    expect(authErrorCode(new TypeError('x'))).toBe('TypeError');
  });

  it('returns "unknown" when there is nothing to show', () => {
    expect(authErrorCode(new Error('x'))).toBe('unknown');
    expect(authErrorCode(undefined)).toBe('unknown');
    expect(authErrorCode('oops')).toBe('unknown');
    expect(authErrorCode({ code: '' })).toBe('unknown');
  });
});
