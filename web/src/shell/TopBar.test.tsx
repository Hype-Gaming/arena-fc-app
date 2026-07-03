import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TopBar } from './TopBar';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TopBar />
      <Routes>
        <Route path="/" element={<div>Home route</div>} />
        <Route path="/bilhetes" element={<div>Bilhetes route</div>} />
        <Route path="/tipster" element={<div>Tipster route</div>} />
        <Route path="/planos" element={<div>Planos route</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TopBar', () => {
  it('returns to the sport page via the back arrow', async () => {
    const user = userEvent.setup();
    renderAt('/perfil');
    await user.click(screen.getByRole('button', { name: /voltar para os esportes/i }));
    expect(screen.getByText('Bilhetes route')).toBeInTheDocument();
  });

  it('hides the back arrow while already on the sport page', () => {
    renderAt('/bilhetes');
    expect(
      screen.queryByRole('button', { name: /voltar para os esportes/i }),
    ).not.toBeInTheDocument();
  });

  it('routes the logo home and the pills to Tipster/Planos', async () => {
    const user = userEvent.setup();
    renderAt('/perfil');

    await user.click(screen.getByRole('button', { name: /início/i }));
    expect(screen.getByText('Home route')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /criar odds/i }));
    expect(screen.getByText('Tipster route')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^planos$/i }));
    expect(screen.getByText('Planos route')).toBeInTheDocument();
  });
});
