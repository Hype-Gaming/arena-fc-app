// web/src/lib/tokenStorage.ts
// Reuses the plain 'accessToken'/'refreshToken' localStorage keys that the
// already-shipped API modules (tipsterApi, adminApi, tutorialApi) read from,
// so a single login populates the token used everywhere.
const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';
const ADMIN_ACCESS_KEY = 'adminAccessToken';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export const tokenStorage = {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  },
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },
  setTokens({ accessToken, refreshToken }: Tokens): void {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(ADMIN_ACCESS_KEY);
  },
};
