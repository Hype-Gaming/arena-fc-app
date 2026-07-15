import { describe, it, expect, beforeEach } from 'vitest';
import { tokenStorage } from './tokenStorage';

describe('tokenStorage', () => {
  beforeEach(() => localStorage.clear());

  it('returns null tokens when nothing stored', () => {
    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();
  });

  it('persists and reads access + refresh tokens', () => {
    tokenStorage.setTokens({ accessToken: 'acc', refreshToken: 'ref' });
    expect(tokenStorage.getAccessToken()).toBe('acc');
    expect(tokenStorage.getRefreshToken()).toBe('ref');
  });

  it('clears tokens', () => {
    tokenStorage.setTokens({ accessToken: 'acc', refreshToken: 'ref' });
    tokenStorage.clear();
    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();
  });

  it('uses the shared "accessToken" key read by the existing API modules', () => {
    tokenStorage.setTokens({ accessToken: 'acc', refreshToken: 'ref' });
    expect(localStorage.getItem('accessToken')).toBe('acc');
    expect(localStorage.getItem('refreshToken')).toBe('ref');
  });
});
