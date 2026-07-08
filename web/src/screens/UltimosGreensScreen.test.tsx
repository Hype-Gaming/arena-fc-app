import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UltimosGreensScreen } from './UltimosGreensScreen';

const iso = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * 86_400_000).toISOString();

const green = (id: string, home: string, away: string, startsAt: string, odd = 1.5) => ({
  id,
  categoria: 'safes',
  tierLabel: 'Básico',
  titulo: 'Bilhete',
  mercado: '1x2',
  selecao: home,
  linha: null,
  homeTeam: home,
  awayTeam: away,
  homeColor: null,
  awayColor: null,
  homeLogo: null,
  awayLogo: null,
  competition: 'La Liga',
  startsAt,
  odd,
  resultado: 'green',
});

describe('UltimosGreensScreen', () => {
  it('lists green tickets from the history endpoint with their odd', async () => {
    const api = {
      get: vi.fn().mockResolvedValue([
        green('1', 'Real Madrid', 'Getafe', iso(0), 1.44),
        green('2', 'Bayern', 'Werder', iso(10), 1.66),
      ]),
    };
    render(<UltimosGreensScreen api={api as never} />);

    expect(api.get).toHaveBeenCalledWith('/bilhetes/historico');
    expect(await screen.findByText('Real Madrid')).toBeInTheDocument();
    expect(screen.getByText('Bayern')).toBeInTheDocument();
    expect(screen.getByText('1.44')).toBeInTheDocument();
    // Today's group is labelled HOJE.
    expect(screen.getByText('HOJE')).toBeInTheDocument();
  });

  it('filters by period (Hoje hides older greens)', async () => {
    const api = {
      get: vi.fn().mockResolvedValue([
        green('1', 'Real Madrid', 'Getafe', iso(0)),
        green('2', 'Bayern', 'Werder', iso(10)),
      ]),
    };
    const user = userEvent.setup();
    render(<UltimosGreensScreen api={api as never} />);

    await screen.findByText('Real Madrid');
    await user.click(screen.getByRole('tab', { name: 'Hoje' }));

    expect(screen.getByText('Real Madrid')).toBeInTheDocument();
    expect(screen.queryByText('Bayern')).not.toBeInTheDocument();
  });

  it('shows an empty state when there are no greens', async () => {
    const api = { get: vi.fn().mockResolvedValue([]) };
    render(<UltimosGreensScreen api={api as never} />);
    expect(await screen.findByText(/nenhum green/i)).toBeInTheDocument();
  });
});
