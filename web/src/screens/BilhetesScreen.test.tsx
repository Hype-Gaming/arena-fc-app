// web/src/screens/BilhetesScreen.test.tsx
import { describe, it, expect } from 'vitest';
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

  it('opens the explainer popup for a locked market that has one, then funnels to plans', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('tab', { name: /alavancagem/i }));

    // The popup opens instead of jumping straight to the paywall.
    expect(
      screen.getByRole('heading', { name: /como funciona a alavancagem/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/etapa 1/i)).toBeInTheDocument();
    expect(screen.queryByText('Planos route')).not.toBeInTheDocument();

    // The CTA funnels to the plans screen.
    await user.click(screen.getByRole('button', { name: /tenho interesse/i }));
    expect(screen.getByText('Planos route')).toBeInTheDocument();
  });
});
