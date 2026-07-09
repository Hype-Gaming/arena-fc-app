import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminPage } from './AdminPage';

vi.mock('./adminApi', () => ({
  adminApi: {
    listCategories: vi.fn().mockResolvedValue([]),
    listMatches: vi.fn().mockResolvedValue([{ id: 'm1', homeTeam: 'A', awayTeam: 'B' }]),
    listUsers: vi
      .fn()
      .mockResolvedValue([{ id: 'u1', email: 'a@x.com', role: 'user', level: 2, balance: 10 }]),
    listEntradas: vi.fn().mockResolvedValue([]),
    listBilhetes: vi.fn().mockResolvedValue([]),
    listTeams: vi.fn().mockResolvedValue([]),
    listSportEvents: vi.fn().mockResolvedValue([]),
  },
}));

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the backoffice heading and the Bilhetes tab by default', () => {
    render(<AdminPage />);
    expect(screen.getByRole('heading', { name: /backoffice/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^bilhetes$/i })).toHaveAttribute(
      'data-active',
      'true',
    );
  });

  it('shows matches under the Jogos tab', async () => {
    const user = userEvent.setup();
    render(<AdminPage />);
    await user.click(screen.getByRole('button', { name: /jogos/i }));
    expect(await screen.findByText('A vs B')).toBeInTheDocument();
  });

  it('shows users with balances under the Usuários tab', async () => {
    const user = userEvent.setup();
    render(<AdminPage />);
    await user.click(screen.getByRole('button', { name: /usuários/i }));
    expect(await screen.findByText(/a@x.com/)).toBeInTheDocument();
  });
});
