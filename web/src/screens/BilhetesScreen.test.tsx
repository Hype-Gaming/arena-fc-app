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
  it('renders the markets header, chips and the default Odds Safes cards', () => {
    renderScreen();
    expect(
      screen.getByRole('heading', { name: /mercados disponíveis/i }),
    ).toBeInTheDocument();

    const safes = screen.getByRole('tab', { name: /odds safes/i });
    expect(safes).toHaveAttribute('aria-selected', 'true');

    // default category shows its mocked tickets
    expect(screen.getByText('Espanha')).toBeInTheDocument();
    expect(screen.getByText('Portugal')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /adicionar/i })).toHaveLength(4);
  });

  it('switches cards when another unlocked market chip is picked', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('tab', { name: /odds ultra/i }));

    expect(screen.getByText('Inglaterra')).toBeInTheDocument();
    expect(screen.queryByText('Espanha')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /adicionar/i })).toHaveLength(2);
  });

  it('sends locked market chips to the plans screen', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('tab', { name: /alavancagem/i }));
    expect(screen.getByText('Planos route')).toBeInTheDocument();
  });
});
