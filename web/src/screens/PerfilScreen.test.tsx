// web/src/screens/PerfilScreen.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PerfilScreen } from './PerfilScreen';

const me = {
  email: 'a@b.com',
  planKey: 'premium',
  planName: 'Premium',
  creditBalance: 7,
};

const gamification = {
  xp: 250,
  level: 3,
  currentLevelFloor: 200,
  nextLevelXp: 400,
  achievements: [
    {
      key: 'first_unlock',
      name: 'Primeira Entrada',
      description: 'Destrave sua primeira entrada.',
      icon: 'trophy',
      unlocked: true,
      unlockedAt: '2026-06-01T00:00:00.000Z',
      progress: 1,
      threshold: 1,
    },
    {
      key: 'ten_unlocks',
      name: 'Caçador de Tips',
      description: 'Destrave 10 entradas.',
      icon: 'trophy',
      unlocked: false,
      unlockedAt: null,
      progress: 1,
      threshold: 10,
    },
  ],
};

function makeApi() {
  return {
    get: vi.fn((path: string) => {
      if (path === '/me') return Promise.resolve(me);
      if (path === '/gamification/me') return Promise.resolve(gamification);
      return Promise.reject(new Error(`unexpected ${path}`));
    }),
  };
}

describe('PerfilScreen', () => {
  beforeEach(() => {
    vi.stubGlobal('open', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows email, plan, level and xp', async () => {
    render(<PerfilScreen api={makeApi() as never} onLogout={vi.fn()} />);

    expect(await screen.findByText('a@b.com')).toBeInTheDocument();
    expect(screen.getByText(/plano premium/i)).toBeInTheDocument();
    expect(screen.getByText(/nível 3/i)).toBeInTheDocument();
    expect(screen.getByText(/250 xp/i)).toBeInTheDocument();
  });

  it('lists achievements marking unlocked ones', async () => {
    render(<PerfilScreen api={makeApi() as never} onLogout={vi.fn()} />);

    const unlocked = await screen.findByLabelText('Primeira Entrada');
    expect(unlocked).toHaveAttribute('data-unlocked', 'true');
    expect(screen.getByLabelText('Caçador de Tips')).toHaveAttribute(
      'data-unlocked',
      'false',
    );
  });

  it('opens the checkout URL in a new tab when Upgrade is clicked', async () => {
    const user = userEvent.setup();
    render(<PerfilScreen api={makeApi() as never} onLogout={vi.fn()} />);

    await screen.findByText('a@b.com');
    await user.click(screen.getByRole('button', { name: /upgrade/i }));

    expect(window.open).toHaveBeenCalledTimes(1);
    const [url, target] = (window.open as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(typeof url).toBe('string');
    expect((url as string).length).toBeGreaterThan(0);
    expect(target).toBe('_blank');
  });

  it('calls onLogout when Sair da Conta is clicked', async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    render(<PerfilScreen api={makeApi() as never} onLogout={onLogout} />);

    await screen.findByText('a@b.com');
    await user.click(screen.getByRole('button', { name: /sair da conta/i }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
