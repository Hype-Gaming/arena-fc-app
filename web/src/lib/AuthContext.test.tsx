import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { tokenStorage } from './tokenStorage';

function Probe() {
  const { isAuthenticated, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="state">{isAuthenticated ? 'in' : 'out'}</span>
      <button onClick={() => login({ accessToken: 'a', refreshToken: 'r' })}>
        login
      </button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => localStorage.clear());

  it('starts logged out when no token stored', () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId('state')).toHaveTextContent('out');
  });

  it('starts logged in when a token is already stored', () => {
    tokenStorage.setTokens({ accessToken: 'a', refreshToken: 'r' });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId('state')).toHaveTextContent('in');
  });

  it('login stores tokens and flips state; logout clears them', () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    act(() => screen.getByText('login').click());
    expect(screen.getByTestId('state')).toHaveTextContent('in');
    expect(tokenStorage.getAccessToken()).toBe('a');

    act(() => screen.getByText('logout').click());
    expect(screen.getByTestId('state')).toHaveTextContent('out');
    expect(tokenStorage.getAccessToken()).toBeNull();
  });
});
