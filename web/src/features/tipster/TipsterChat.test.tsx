import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TipsterChat } from './TipsterChat';
import * as api from './tipsterApi';
import type { UpcomingFeedMatch } from './tipsterApi';

const feedMatch = (
  externalId: string,
  homeTeam: string,
  awayTeam: string,
  competition: string,
): UpcomingFeedMatch => ({
  externalId,
  homeTeam,
  awayTeam,
  competition,
  startsAt: '2026-07-29T21:30:00-03:00',
  oddHome: null,
  oddDraw: null,
  oddAway: null,
  deepLink: `https://x/${externalId}`,
});

describe('TipsterChat', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('searches by team and lists the candidate games to pick from', async () => {
    vi.spyOn(api, 'searchMatches').mockResolvedValue([
      feedMatch('e1', 'Fluminense', 'Bahia', 'Brasileirão Série A'),
      feedMatch('e2', 'Bahia', 'Corinthians', 'Brasileirão Série A'),
    ]);

    render(<TipsterChat suggestions={[]} />);
    fireEvent.change(screen.getByPlaceholderText(/pergunte sobre um jogo/i), {
      target: { value: 'bahia' },
    });
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }));

    expect(await screen.findByText(/qual quer analisar\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Fluminense/)).toBeInTheDocument();
    expect(screen.getByText(/Corinthians/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /não é esse time/i })).toBeInTheDocument();
  });

  it('picking a candidate shows the confirm step', async () => {
    vi.spyOn(api, 'searchMatches').mockResolvedValue([
      feedMatch('e1', 'Fluminense', 'Bahia', 'Brasileirão Série A'),
    ]);

    render(<TipsterChat suggestions={[]} />);
    fireEvent.change(screen.getByPlaceholderText(/pergunte sobre um jogo/i), {
      target: { value: 'bahia' },
    });
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }));
    fireEvent.click(await screen.findByText(/Fluminense/));

    expect(await screen.findByText(/confirma para analisar/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analisar/i })).toBeInTheDocument();
  });

  it('confirming triggers analyzeUpcoming and renders the assistant message', async () => {
    vi.spyOn(api, 'searchMatches').mockResolvedValue([
      feedMatch('e1', 'Fluminense', 'Bahia', 'Brasileirão Série A'),
    ]);
    const analyzeSpy = vi.spyOn(api, 'analyzeUpcoming').mockResolvedValue({
      sessionId: 's1',
      message: '🎯 ENTRADA PRINCIPAL\nFluminense vence',
      entradaId: null,
      balanceAfter: 7,
    });

    render(<TipsterChat suggestions={[]} />);
    fireEvent.change(screen.getByPlaceholderText(/pergunte sobre um jogo/i), {
      target: { value: 'bahia' },
    });
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }));
    fireEvent.click(await screen.findByText(/Fluminense/));
    fireEvent.click(await screen.findByRole('button', { name: /analisar/i }));

    await waitFor(() => expect(analyzeSpy).toHaveBeenCalledWith('e1'));
    expect(await screen.findByText(/ENTRADA PRINCIPAL/)).toBeInTheDocument();
  });

  it('shows a buy-credits CTA on 402 when onBuyCredits is provided', async () => {
    vi.spyOn(api, 'searchMatches').mockResolvedValue([
      feedMatch('e1', 'Fluminense', 'Bahia', 'Brasileirão Série A'),
    ]);
    const err = Object.assign(new Error('Insufficient credits'), { status: 402 });
    vi.spyOn(api, 'analyzeUpcoming').mockRejectedValue(err);
    const onBuyCredits = vi.fn();

    render(<TipsterChat onBuyCredits={onBuyCredits} suggestions={[]} />);
    fireEvent.change(screen.getByPlaceholderText(/pergunte sobre um jogo/i), {
      target: { value: 'bahia' },
    });
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }));
    fireEvent.click(await screen.findByText(/Fluminense/));
    fireEvent.click(await screen.findByRole('button', { name: /analisar/i }));

    const cta = await screen.findByRole('button', { name: /comprar créditos/i });
    fireEvent.click(cta);
    expect(onBuyCredits).toHaveBeenCalled();
  });

  it('shows a helpful error when no game is found', async () => {
    vi.spyOn(api, 'searchMatches').mockResolvedValue([]);

    render(<TipsterChat suggestions={[]} />);
    fireEvent.change(screen.getByPlaceholderText(/pergunte sobre um jogo/i), {
      target: { value: 'zzz' },
    });
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }));

    expect(await screen.findByText(/não achei jogos/i)).toBeInTheDocument();
  });

  it('picking an empty-state suggestion goes straight to the confirm step', async () => {
    render(
      <TipsterChat
        suggestions={[feedMatch('m9', 'Espanha', 'Áustria', 'Copa do Mundo')]}
      />,
    );

    fireEvent.click(screen.getByText(/Espanha/));
    expect(await screen.findByText(/confirma para analisar/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analisar/i })).toBeInTheDocument();
  });
});
