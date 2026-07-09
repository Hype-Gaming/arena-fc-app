import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TelegramGateProvider, useGate } from './TelegramGate';

function Consumer() {
  const { requireUnlock } = useGate();
  return (
    <button onClick={() => requireUnlock(() => (globalThis as any).__ran?.())}>
      função
    </button>
  );
}

function gateApi(state: {
  applies: boolean;
  clicked: boolean;
  unlocked: boolean;
  remainingSeconds: number;
  waitSeconds: number;
  clickedAt: string | null;
}) {
  return {
    get: vi.fn().mockResolvedValue(state),
    post: vi.fn().mockResolvedValue({ ...state, clicked: true }),
  };
}

describe('TelegramGateProvider', () => {
  it('runs the action directly when already unlocked', async () => {
    const ran = vi.fn();
    (globalThis as any).__ran = ran;
    const api = gateApi({
      applies: true,
      clicked: true,
      unlocked: true,
      remainingSeconds: 0,
      waitSeconds: 600,
      clickedAt: new Date().toISOString(),
    });

    render(
      <TelegramGateProvider api={api}>
        <Consumer />
      </TelegramGateProvider>,
    );
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: 'função' }));
    expect(ran).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('blocks the action and opens the popup while locked', async () => {
    const ran = vi.fn();
    (globalThis as any).__ran = ran;
    const api = gateApi({
      applies: true,
      clicked: false,
      unlocked: false,
      remainingSeconds: 600,
      waitSeconds: 600,
      clickedAt: null,
    });

    render(
      <TelegramGateProvider api={api}>
        <Consumer />
      </TelegramGateProvider>,
    );
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: 'função' }));
    expect(ran).not.toHaveBeenCalled();
    expect(
      screen.getByRole('heading', { name: /confirme sua banca no telegram/i }),
    ).toBeInTheDocument();
  });

  it('records the click when the user enters Telegram', async () => {
    const api = gateApi({
      applies: true,
      clicked: false,
      unlocked: false,
      remainingSeconds: 600,
      waitSeconds: 600,
      clickedAt: null,
    });
    vi.stubGlobal('open', vi.fn());

    render(
      <TelegramGateProvider api={api}>
        <Consumer />
      </TelegramGateProvider>,
    );
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: 'função' }));
    await userEvent.click(screen.getByRole('button', { name: /entrar no telegram/i }));

    expect(api.post).toHaveBeenCalledWith('/me/telegram-gate/click');
    vi.unstubAllGlobals();
  });
});
