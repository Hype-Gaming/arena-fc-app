import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TutorialOverlay } from './TutorialOverlay';
import { fetchLatestTutorial } from '../api/tutorialApi';

vi.mock('../api/tutorialApi', () => ({
  fetchLatestTutorial: vi.fn(),
}));

const tutorial = {
  version: 2,
  steps: [
    { title: 'Passo 1', body: 'Bem-vindo' },
    { title: 'Passo 2', body: 'Use creditos' },
  ],
};

describe('TutorialOverlay', () => {
  beforeEach(() => {
    localStorage.clear();
    (fetchLatestTutorial as any).mockResolvedValue(tutorial);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('walks through the first-access steps and closes on the last one', async () => {
    render(<TutorialOverlay />);
    expect(await screen.findByText('Passo 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    expect(screen.getByText('Passo 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /começar/i }));

    expect(localStorage.getItem('tutorialSeenVersion')).toBe('2');
    expect(screen.queryByText('Passo 2')).not.toBeInTheDocument();
  });

  it('does not render when this version was already seen', async () => {
    localStorage.setItem('tutorialSeenVersion', '2');
    render(<TutorialOverlay />);

    await waitFor(() => expect(fetchLatestTutorial).toHaveBeenCalled());
    expect(screen.queryByText('Passo 1')).not.toBeInTheDocument();
  });

  it('does not render when the tutorial has no steps', async () => {
    (fetchLatestTutorial as any).mockResolvedValue({ version: 3, steps: [] });
    render(<TutorialOverlay />);

    await waitFor(() => expect(fetchLatestTutorial).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
