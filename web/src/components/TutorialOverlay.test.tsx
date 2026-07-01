import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TutorialOverlay } from './TutorialOverlay';
import { fetchLatestTutorial } from '../api/tutorialApi';

vi.mock('../api/tutorialApi', () => ({ fetchLatestTutorial: vi.fn() }));

describe('TutorialOverlay', () => {
  beforeEach(() => {
    localStorage.clear();
    (fetchLatestTutorial as any).mockResolvedValue({
      version: 2,
      steps: [
        { title: 'Passo 1', body: 'Bem-vindo' },
        { title: 'Passo 2', body: 'Use creditos' },
      ],
    });
  });
  afterEach(() => vi.clearAllMocks());

  it('shows the first step on first access then advances and dismisses', async () => {
    render(<TutorialOverlay />);
    expect(await screen.findByText('Passo 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Passo 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /done/i }));
    expect(screen.queryByText('Passo 2')).not.toBeInTheDocument();
    expect(localStorage.getItem('tutorialSeenVersion')).toBe('2');
  });

  it('does not render when the seen version matches the latest', async () => {
    localStorage.setItem('tutorialSeenVersion', '2');
    render(<TutorialOverlay />);
    expect(screen.queryByText('Passo 1')).not.toBeInTheDocument();
  });
});
