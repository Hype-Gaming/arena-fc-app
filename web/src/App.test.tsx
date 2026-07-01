// web/src/App.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';
import { tokenStorage } from './lib/tokenStorage';

function makeApi() {
  return {
    get: vi.fn((path: string) => {
      if (path === '/tips/feed') return Promise.resolve({ categories: [] });
      if (path === '/me')
        return Promise.resolve({
          email: 'a@b.com',
          planKey: 'free',
          planName: 'Free',
          creditBalance: 0,
        });
      if (path === '/gamification/me')
        return Promise.resolve({
          xp: 0,
          level: 1,
          currentLevelFloor: 0,
          nextLevelXp: 100,
          achievements: [],
        });
      return Promise.resolve([]);
    }),
    post: vi.fn().mockResolvedValue({}),
  };
}

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <App api={makeApi() as never} />
    </MemoryRouter>,
  );
}

describe('App', () => {
  beforeEach(() => {
    // The first-access TutorialOverlay fetches /api/tutorial/latest; in jsdom
    // that fetch fails and the overlay skips itself gracefully, so it does not
    // cover the shell under test.
    localStorage.clear();
  });

  it('shows the login screen when not authenticated', () => {
    renderApp();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: /navegação principal/i }),
    ).not.toBeInTheDocument();
  });

  it('shows the tabbed shell on Tips when authenticated', async () => {
    tokenStorage.setTokens({ accessToken: 'a', refreshToken: 'r' });
    renderApp();
    expect(
      await screen.findByRole('navigation', { name: /navegação principal/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^tips$/i })).toBeInTheDocument();
  });

  it('navigates to the Perfil tab when its nav link is clicked', async () => {
    const user = userEvent.setup();
    tokenStorage.setTokens({ accessToken: 'a', refreshToken: 'r' });
    renderApp();

    await user.click(await screen.findByRole('link', { name: /perfil/i }));
    expect(await screen.findByText('Free')).toBeInTheDocument();
  });
});
