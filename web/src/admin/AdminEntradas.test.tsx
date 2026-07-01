import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminEntradas } from './AdminEntradas';
import { adminApi } from './adminApi';

vi.mock('./adminApi', () => ({
  adminApi: {
    listEntradas: vi.fn(),
    setEntradaResult: vi.fn(),
  },
}));

describe('AdminEntradas', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders entradas for the match and marks one green', async () => {
    (adminApi.listEntradas as any).mockResolvedValue([
      { id: 'e1', market: 'Resultado', selection: 'Casa', odd: 1.85, status: 'pending' },
    ]);
    (adminApi.setEntradaResult as any).mockResolvedValue({ id: 'e1', status: 'green' });

    render(<AdminEntradas matchId="m1" />);

    expect(await screen.findByText('Resultado — Casa')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /green/i }));

    await waitFor(() =>
      expect(adminApi.setEntradaResult).toHaveBeenCalledWith('e1', 'green'),
    );
    expect(await screen.findByText('green')).toBeInTheDocument();
  });
});
