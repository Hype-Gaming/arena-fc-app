// web/src/screens/BilhetesScreen.test.tsx
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { BilhetesScreen } from './BilhetesScreen';

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/bilhetes']}>
      <Routes>
        <Route path="/bilhetes" element={<BilhetesScreen />} />
        <Route path="/planos" element={<div>Planos route</div>} />
        <Route path="/tipster" element={<div>Tipster route</div>} />
        <Route path="/" element={<div>Home route</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('BilhetesScreen', () => {
  beforeEach(() => window.localStorage.clear());

  it('expands a multiple and loads its Esportiva share URL in the existing iframe', async () => {
    const user = userEvent.setup();
    const api = {
      get: vi.fn().mockResolvedValue({
        plan: { key: 'diamante', rank: 2 },
        categorias: [{ key: 'multiplas', label: 'Múltiplas', count: 1, locked: false }],
        bilhetes: [{
          id: 'multi-1', categoria: 'multiplas', tierLabel: 'Ultra', titulo: 'Múltipla do dia',
          mercado: null, selecao: null, linha: null, homeTeam: 'Bahia', awayTeam: 'Santos',
          homeColor: null, awayColor: null, homeLogo: null, awayLogo: null, competition: null,
          startsAt: '2026-08-01T16:00:00.000Z', validUntil: '2026-08-01T16:00:00.000Z',
          odd: 3.2, resultado: 'pending', deepLink: 'https://esportiva.bet.br/sports?bt-path=event',
          esportivaShareUrl: 'https://esportiva.bet.br/sports?shareCode=JB671YVFQJF',
          legs: [
            { homeTeam: 'Bahia', awayTeam: 'Vitoria', mercado: '1x2', selecao: 'Bahia', linha: null, odd: 1.6 },
            { homeTeam: 'Santos', awayTeam: 'Corinthians', mercado: 'btts', selecao: 'Sim', linha: null, odd: 2 },
          ],
        }],
      }),
    };
    render(
      <MemoryRouter initialEntries={['/bilhetes']}>
        <Routes><Route path="/bilhetes" element={<BilhetesScreen api={api} />} /></Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: /ver seleções \(2\)/i }));
    expect(screen.getByText('Bahia x Vitoria')).toBeInTheDocument();
    expect(screen.getByText('Santos x Corinthians')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /adicionar/i }));
    expect(screen.getByTitle('Esportiva')).toHaveAttribute(
      'src',
      'https://esportiva.bet.br/sports?shareCode=JB671YVFQJF',
    );
    expect(screen.getByRole('link', { name: /abrir cupom em nova aba/i })).toHaveAttribute(
      'href',
      'https://esportiva.bet.br/sports?shareCode=JB671YVFQJF',
    );
  });

  it('renders the markets header and an empty rail without demo tickets', () => {
    renderScreen();
    expect(
      screen.getByRole('heading', { name: /mercados disponíveis/i }),
    ).toBeInTheDocument();

    const safes = screen.getByRole('tab', { name: /odds safes/i });
    expect(safes).toHaveAttribute('aria-selected', 'true');

    expect(screen.getByText(/nenhum bilhete publicado/i)).toBeInTheDocument();
    expect(screen.queryByText('Espanha')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /adicionar/i })).not.toBeInTheDocument();
  });

  it('switches unlocked market chips without showing demo tickets', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('tab', { name: /odds ultra/i }));

    expect(screen.getByText(/nenhum bilhete publicado/i)).toBeInTheDocument();
    expect(screen.queryByText('Inglaterra')).not.toBeInTheDocument();
    expect(screen.queryByText('Espanha')).not.toBeInTheDocument();
  });

  it('sends a locked market chip without an explainer straight to the plans screen', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('tab', { name: /ligas americanas/i }));
    expect(screen.getByText('Planos route')).toBeInTheDocument();
  });

  it('opens the explainer popup for a locked market with its checkout link', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('tab', { name: /alavancagem/i }));

    // The popup opens instead of jumping straight to the paywall.
    expect(
      screen.getByRole('heading', { name: /como funciona a alavancagem/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /alavancagem/i })).toHaveAttribute(
      'src',
      '/alavancagem-2%20%282%29.png',
    );
    expect(screen.getByText(/etapa 1/i)).toBeInTheDocument();
    expect(screen.queryByText('Planos route')).not.toBeInTheDocument();

    expect(screen.getByRole('link', { name: /tenho interesse/i })).toHaveAttribute(
      'href',
      'https://checkout.payt.com.br/e508405c78d7aa3b6f7c3ab41a557536',
    );
  });

  it('does not replace the iframe for a ticket without shareCode or selections', async () => {
    const user = userEvent.setup();
    const api = {
      get: vi.fn().mockResolvedValue({
        plan: { key: 'diamante', rank: 2 },
        categorias: [{ key: 'safes', label: 'Odds Safes', count: 1, locked: false }],
        bilhetes: [{
          id: 'plain-1', categoria: 'safes', tierLabel: 'Básico', titulo: 'Sem cupom',
          mercado: null, selecao: null, linha: null, homeTeam: 'Bahia', awayTeam: 'Santos',
          homeColor: null, awayColor: null, homeLogo: null, awayLogo: null, competition: null,
          startsAt: '2026-08-01T16:00:00.000Z', validUntil: '2026-08-01T16:00:00.000Z',
          odd: 1.5, resultado: 'pending', deepLink: 'https://esportiva.bet.br/sports/event/1',
          esportivaShareUrl: null, legs: [],
        }],
      }),
    };
    render(
      <MemoryRouter initialEntries={['/bilhetes']}>
        <Routes><Route path="/bilhetes" element={<BilhetesScreen api={api} />} /></Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: /adicionar/i }));
    expect(screen.getByRole('status')).toHaveTextContent(/ainda não possui um cupom/i);
    expect(screen.getByTitle('Esportiva')).toHaveAttribute(
      'src',
      'https://esportiva.bet.br/sports/soccer/sp-66',
    );
  });
});
