import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminPage } from './AdminPage';
import { adminApi } from './adminApi';

vi.mock('./adminApi', () => ({
  adminApi: {
    listCategories: vi.fn().mockResolvedValue([]),
    listMatches: vi.fn().mockResolvedValue([{ id: 'm1', homeTeam: 'A', awayTeam: 'B' }]),
    listUsers: vi.fn().mockResolvedValue([{ id: 'u1', email: 'a@x.com', balance: 10 }]),
    listEntradas: vi.fn().mockResolvedValue([]),
    listBilhetes: vi.fn().mockResolvedValue([]),
  },
}));

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders backoffice sections and a match row', async () => {
    render(<AdminPage />);
    expect(screen.getByRole('heading', { name: /backoffice/i })).toBeInTheDocument();
    expect(await screen.findByText('A vs B')).toBeInTheDocument();
    expect(await screen.findByText(/a@x.com/)).toBeInTheDocument();
  });
});
