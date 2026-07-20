// web/src/screens/HomeScreen.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HomeScreen } from './HomeScreen';

function renderHome(api?: { get: ReturnType<typeof vi.fn> }) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomeScreen api={api as never} />} />
        <Route path="/bilhetes" element={<div>Bilhetes route</div>} />
        <Route path="/tipster" element={<div>Tipster route</div>} />
        <Route path="/planos" element={<div>Planos route</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('HomeScreen', () => {
  it('renders the section headers and main cards', () => {
    renderHome();

    expect(screen.getByRole('heading', { name: /principais/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /acesso rápido/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /ultimos bilhetes/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /entradas do dia/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /analises de ia em tempo real/i }),
    ).toBeInTheDocument();
  });

  it('routes the Entradas do Dia card to Bilhetes', async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByRole('button', { name: /^acessar$/i }));
    expect(screen.getByText('Bilhetes route')).toBeInTheDocument();
  });

  it('routes the AI card to the Tipster', async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByRole('button', { name: /testar a ia tipster/i }));
    expect(screen.getByText('Tipster route')).toBeInTheDocument();
  });

  it('opens the explainer popup from a locked "Desbloquear" card with its checkout link', async () => {
    const user = userEvent.setup();
    renderHome();

    // First locked quick-access card is "Odds Altas".
    const [firstUnlock] = screen.getAllByRole('button', { name: /desbloquear/i });
    await user.click(firstUnlock);

    // The popup opens instead of jumping straight to the paywall.
    expect(
      screen.getByRole('heading', { name: /como funciona as odds altas/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /odds altas/i })).toHaveAttribute(
      'src',
      '/alavancagem-2%20%281%29.png',
    );
    expect(screen.queryByText('Planos route')).not.toBeInTheDocument();

    expect(screen.getByRole('link', { name: /tenho interesse/i })).toHaveAttribute(
      'href',
      'https://checkout.payt.com.br/bb0d17f48cfc7137913002d334cfe7ff',
    );
  });

  it('unlocks the plan-gated cards for a Diamante plan', async () => {
    const user = userEvent.setup();
    const api = { get: vi.fn().mockResolvedValue({ planKey: 'diamante' }) };
    renderHome(api);

    // Once /me resolves, both teasers drop their lock: no "Desbloquear" remains.
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /desbloquear/i })).not.toBeInTheDocument(),
    );

    // Alavancagem now links to the real content instead of the paywall funnel.
    const acessar = screen.getAllByRole('button', { name: /^acessar$/i });
    await user.click(acessar[acessar.length - 1]);
    expect(screen.getByText('Bilhetes route')).toBeInTheDocument();
  });

  it('keeps Alavancagem locked for a Premium plan (rank below Diamante)', async () => {
    const api = { get: vi.fn().mockResolvedValue({ planKey: 'premium' }) };
    renderHome(api);

    // Premium unlocks Odds Altas (rank 1) but not Alavancagem (rank 2), so
    // exactly one "Desbloquear" survives.
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /desbloquear/i })).toHaveLength(1),
    );
  });
});
