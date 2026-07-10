import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TipsterLive } from './TipsterLive';
import * as api from './tipsterApi';
import type { LiveMatch } from './tipsterApi';

const match: LiveMatch = {
  externalId: 'x1',
  homeTeam: 'Bayern',
  awayTeam: 'Werder',
  competition: 'Bundesliga',
  minute: "30'",
  homeScore: 1,
  awayScore: 0,
  statusText: '2ª parte',
  oddHome: 1.5,
  oddDraw: 3.4,
  oddAway: 6,
  deepLink: 'https://x/x1',
};

describe('TipsterLive', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('lists the live match with score and minute (preset matches skip fetch)', () => {
    render(<TipsterLive matches={[match]} />);
    expect(screen.getByText('Bayern')).toBeInTheDocument();
    expect(screen.getByText('Werder')).toBeInTheDocument();
    expect(screen.getByText(/30'/)).toBeInTheDocument();
    expect(screen.getByText('1 jogos ao vivo')).toBeInTheDocument();
    expect(screen.getByText(/toque para análise ia/i)).toBeInTheDocument();
  });

  it('analyzes a live match and shows the AI analysis, updating the balance', async () => {
    const spy = vi.spyOn(api, 'analyzeLive').mockResolvedValue({
      sessionId: 's1',
      message: '🎯 ENTRADA PRINCIPAL\nBayern vence',
      entradaId: null,
      balanceAfter: 4,
    });
    const onBalance = vi.fn();

    render(<TipsterLive matches={[match]} onBalance={onBalance} />);
    fireEvent.click(screen.getByRole('button', { name: /analisar bayern x werder/i }));

    await waitFor(() => expect(spy).toHaveBeenCalledWith('x1'));
    expect(await screen.findByText(/ENTRADA PRINCIPAL/)).toBeInTheDocument();
    expect(onBalance).toHaveBeenCalledWith(4);
  });

  it('shows the buy-credits banner on a 402', async () => {
    vi.spyOn(api, 'analyzeLive').mockRejectedValue(
      Object.assign(new Error('sem créditos'), { status: 402 }),
    );
    const onBuyCredits = vi.fn();

    render(<TipsterLive matches={[match]} onBuyCredits={onBuyCredits} />);
    fireEvent.click(screen.getByRole('button', { name: /analisar bayern x werder/i }));

    expect(await screen.findByText(/sem créditos/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /comprar créditos/i }));
    expect(onBuyCredits).toHaveBeenCalled();
  });

  it('renders an empty state when no matches are live', () => {
    render(<TipsterLive matches={[]} />);
    expect(
      screen.getByText(/nenhum jogo ao vivo das principais ligas/i),
    ).toBeInTheDocument();
  });
});
