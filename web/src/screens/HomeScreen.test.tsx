// web/src/screens/HomeScreen.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HomeScreen } from './HomeScreen';

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/bilhetes" element={<div>Bilhetes route</div>} />
        <Route path="/tipster" element={<div>Tipster route</div>} />
        <Route path="/planos" element={<div>Planos route</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('HomeScreen', () => {
  beforeEach(() => {
    vi.stubGlobal('open', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the section headers and main cards', () => {
    renderHome();

    expect(screen.getByRole('heading', { name: /principais/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /acesso rapido/i })).toBeInTheDocument();
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

  it('opens the explainer popup from a locked "Desbloquear" card, then funnels to plans', async () => {
    const user = userEvent.setup();
    renderHome();

    // First locked quick-access card is "Odds Altas".
    const [firstUnlock] = screen.getAllByRole('button', { name: /desbloquear/i });
    await user.click(firstUnlock);

    // The popup opens instead of jumping straight to the paywall.
    expect(
      screen.getByRole('heading', { name: /como funciona as odds altas/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Planos route')).not.toBeInTheDocument();

    // The CTA funnels to the plans screen.
    await user.click(screen.getByRole('button', { name: /tenho interesse/i }));
    expect(screen.getByText('Planos route')).toBeInTheDocument();
  });
});
