// web/src/screens/HomeScreen.test.tsx
import { describe, it, expect } from 'vitest';
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
  it('renders the section headers and main cards', () => {
    renderHome();
    expect(screen.getByRole('heading', { name: /principal/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /acesso rápido/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /últimos ingressos/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^futebol$/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /análise de ia em tempo real/i }),
    ).toBeInTheDocument();
  });

  it('routes the Futebol card to Bilhetes', async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(screen.getByRole('button', { name: /^acesso$/i }));
    expect(screen.getByText('Bilhetes route')).toBeInTheDocument();
  });

  it('routes the AI card to the Tipster', async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(screen.getByRole('button', { name: /teste de dicas de ia/i }));
    expect(screen.getByText('Tipster route')).toBeInTheDocument();
  });

  it('sends locked quick-access cards to the plans screen', async () => {
    const user = userEvent.setup();
    renderHome();
    const [firstUnlock] = screen.getAllByRole('button', { name: /desbloquear/i });
    await user.click(firstUnlock);
    expect(screen.getByText('Planos route')).toBeInTheDocument();
  });
});
