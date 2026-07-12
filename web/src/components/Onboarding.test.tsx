import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Onboarding } from './Onboarding';

function gateApi(applies: boolean, clicked: boolean) {
  const state = {
    applies,
    clicked,
    clickedAt: clicked ? new Date().toISOString() : null,
    unlocked: false,
    waitSeconds: 600,
    remainingSeconds: 600,
  };
  return {
    get: vi.fn().mockResolvedValue(state),
    post: vi.fn().mockResolvedValue({ ...state, clicked: true }),
  };
}

describe('Onboarding', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not open for a free user (gate does not apply)', async () => {
    const api = gateApi(false, false);
    render(<Onboarding api={api} />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not open for a user who already activated on Telegram', async () => {
    const api = gateApi(true, true);
    render(<Onboarding api={api} />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('walks a paid buyer to the mandatory Telegram step and activates', async () => {
    vi.stubGlobal('open', vi.fn());
    const user = userEvent.setup();
    const api = gateApi(true, false);
    render(<Onboarding api={api} />);

    // Opens on the welcome hub.
    expect(await screen.findByRole('heading', { name: /seja bem-vindo/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /começar/i }));
    // Tour → shortcut → telegram.
    await user.click(screen.getByRole('button', { name: /próximo passo/i }));
    await user.click(screen.getByRole('button', { name: /próximo passo/i }));

    // Mandatory step copy present.
    expect(screen.getByText(/não pode pular essa etapa/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /ativar minha conta/i }));

    // Records the click (starts the 10-min timer) and opens Telegram.
    expect(api.post).toHaveBeenCalledWith('/me/telegram-gate/click');
    expect(window.open).toHaveBeenCalled();
    // Lands on the final "ready" screen.
    expect(await screen.findByRole('heading', { name: /tudo certo/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /verificar bot no telegram/i })).toHaveAttribute(
      'href',
      'https://t.me/arenaofc_bot?start=onboarding',
    );
  });
});
