import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TutorialOverlay } from './TutorialOverlay';
import {
  claimTelegramUnlock,
  fetchLatestTutorial,
  fetchTelegramUnlockStatus,
  startTelegramUnlock,
} from '../api/tutorialApi';

vi.mock('../api/tutorialApi', () => ({
  fetchLatestTutorial: vi.fn(),
  fetchTelegramUnlockStatus: vi.fn(),
  startTelegramUnlock: vi.fn(),
  claimTelegramUnlock: vi.fn(),
}));

const tutorial = {
  version: 2,
  steps: [
    { title: 'Passo 1', body: 'Bem-vindo' },
    { title: 'Passo 2', body: 'Use creditos' },
  ],
};

const idleUnlock = {
  startedAt: null,
  claimAt: null,
  unlockedAt: null,
  remainingSeconds: 600,
  eligible: false,
  planKey: 'diamante',
};

describe('TutorialOverlay', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('open', vi.fn());
    (fetchLatestTutorial as any).mockResolvedValue(tutorial);
    (fetchTelegramUnlockStatus as any).mockResolvedValue(idleUnlock);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows the first-access steps before the Telegram gate', async () => {
    render(<TutorialOverlay />);
    expect(await screen.findByText('Passo 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    expect(screen.getByText('Passo 2')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /liberar app completo/i }),
    );
    expect(screen.getByText(/entre no telegram da arena/i)).toBeInTheDocument();
  });

  it('starts the 10 minute unlock when the Telegram button is clicked', async () => {
    (startTelegramUnlock as any).mockResolvedValue({
      startedAt: '2026-07-06T12:00:00.000Z',
      claimAt: '2026-07-06T12:10:00.000Z',
      unlockedAt: null,
      remainingSeconds: 600,
      eligible: false,
      planKey: 'diamante',
    });

    render(<TutorialOverlay />);
    await screen.findByText('Passo 1');
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    fireEvent.click(
      screen.getByRole('button', { name: /liberar app completo/i }),
    );
    fireEvent.click(screen.getByRole('button', { name: /entrar pelo telegram/i }));

    await waitFor(() => expect(startTelegramUnlock).toHaveBeenCalledTimes(1));
    expect(window.open).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('10:00')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /aguarde o tempo/i }),
    ).toBeDisabled();
  });

  it('claims Diamante when the waiting time is complete', async () => {
    (fetchTelegramUnlockStatus as any).mockResolvedValue({
      startedAt: '2026-07-06T12:00:00.000Z',
      claimAt: '2026-07-06T12:10:00.000Z',
      unlockedAt: null,
      remainingSeconds: 0,
      eligible: true,
      planKey: 'diamante',
    });
    (claimTelegramUnlock as any).mockResolvedValue({
      startedAt: '2026-07-06T12:00:00.000Z',
      claimAt: '2026-07-06T12:10:00.000Z',
      unlockedAt: '2026-07-06T12:11:00.000Z',
      remainingSeconds: 0,
      eligible: true,
      planKey: 'diamante',
    });

    render(<TutorialOverlay />);
    expect(await screen.findByText('00:00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /ativar diamante/i }));

    expect(await screen.findByText(/diamante ativo/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /entrar na arena/i }));
    expect(localStorage.getItem('tutorialSeenVersion')).toBe('2');
  });

  it('does not render when this version was already seen and no unlock is active', async () => {
    localStorage.setItem('tutorialSeenVersion', '2');
    render(<TutorialOverlay />);

    await waitFor(() => expect(fetchLatestTutorial).toHaveBeenCalled());
    expect(screen.queryByText('Passo 1')).not.toBeInTheDocument();
  });
});
