import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TipsterChat } from './TipsterChat';
import * as api from './tipsterApi';

describe('TipsterChat', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('searches on submit and shows the found match with a Confirmar button', async () => {
    vi.spyOn(api, 'searchMatches').mockResolvedValue([
      { id: 'm1', homeTeam: 'São Paulo', awayTeam: 'Palmeiras', competition: 'Brasileirão', startsAt: '', status: 'scheduled' },
    ]);

    render(<TipsterChat />);
    fireEvent.change(screen.getByPlaceholderText(/digite um jogo/i), {
      target: { value: 'sao paulo' },
    });
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }));

    expect(await screen.findByText(/São Paulo x Palmeiras/)).toBeInTheDocument();
    expect(screen.getByText(/achei esse jogo\. confirma\?/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument();
  });

  it('confirming triggers analyze and renders the assistant message', async () => {
    vi.spyOn(api, 'searchMatches').mockResolvedValue([
      { id: 'm1', homeTeam: 'São Paulo', awayTeam: 'Palmeiras', competition: 'Brasileirão', startsAt: '', status: 'scheduled' },
    ]);
    const analyzeSpy = vi.spyOn(api, 'analyzeMatch').mockResolvedValue({
      sessionId: 's1',
      message: '🎯 ENTRADA PRINCIPAL\nMercado: Resultado Final',
      entradaId: 'e1',
      balanceAfter: 7,
    });

    render(<TipsterChat />);
    fireEvent.change(screen.getByPlaceholderText(/digite um jogo/i), { target: { value: 'sao' } });
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }));
    fireEvent.click(await screen.findByRole('button', { name: /confirmar/i }));

    await waitFor(() => expect(analyzeSpy).toHaveBeenCalledWith('m1'));
    expect(await screen.findByText(/ENTRADA PRINCIPAL/)).toBeInTheDocument();
  });

  it('shows an error when analyze fails for insufficient credits', async () => {
    vi.spyOn(api, 'searchMatches').mockResolvedValue([
      { id: 'm1', homeTeam: 'São Paulo', awayTeam: 'Palmeiras', competition: 'Brasileirão', startsAt: '', status: 'scheduled' },
    ]);
    vi.spyOn(api, 'analyzeMatch').mockRejectedValue(new Error('Insufficient credits'));

    render(<TipsterChat />);
    fireEvent.change(screen.getByPlaceholderText(/digite um jogo/i), { target: { value: 'sao' } });
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }));
    fireEvent.click(await screen.findByRole('button', { name: /confirmar/i }));

    expect(await screen.findByText(/insufficient credits/i)).toBeInTheDocument();
  });
});
