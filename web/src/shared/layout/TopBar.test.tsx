import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TopBar } from './TopBar';

function apiForPlan(planKey: string) {
  return { get: vi.fn().mockResolvedValue({ planKey }) };
}

function renderAt(path: string, planKey = 'premium') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TopBar api={apiForPlan(planKey) as never} />
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
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('routes the logo home and shows Planos for paid users outside the sport page', async () => {
    const user = userEvent.setup();
    renderAt('/perfil', 'premium');

    await user.click(screen.getByRole('button', { name: /in/i }));
    expect(screen.getByText('Home route')).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: /criar odds/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^planos$/i }));
    expect(screen.getByText('Planos route')).toBeInTheDocument();
  });

  it('shows Criar Odds beside Resgatar Odd Gratis only on the sport page after Ver entradas', async () => {
    const user = userEvent.setup();
    renderAt('/bilhetes', 'free');

    const criarOdds = await screen.findByRole('button', { name: /criar odds/i });
    const resgatar = await screen.findByRole('button', { name: /resgatar odd gr/i });
    expect(criarOdds.compareDocumentPosition(resgatar)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.queryByRole('button', { name: /^planos$/i })).not.toBeInTheDocument();

    await user.click(criarOdds);
    expect(screen.getByText('Tipster route')).toBeInTheDocument();
  });

  it('shows only Resgatar Odd Gratis for free users outside the sport page, and opens the Telegram popup', async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    renderAt('/perfil', 'free');

    const resgatar = await screen.findByRole('button', {
      name: /resgatar odd gr/i,
    });
    expect(resgatar).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /criar odds/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^planos$/i })).not.toBeInTheDocument();

    await user.click(resgatar);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/grupo do telegram/i)).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole('button', { name: /resgatar odd gr/i }),
    );
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy.mock.calls[0][1]).toBe('_blank');
  });
});
