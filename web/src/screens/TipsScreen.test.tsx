import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TipsScreen } from './TipsScreen';

const feed = [
  {
    category: { id: 'c1', name: 'Futebol', slug: 'futebol' },
    entradas: [
      {
        id: 'e1',
        market: 'Resultado Final',
        selection: 'Casa',
        odd: 1.85,
        costInCredits: 1,
        status: 'pending',
        justification: null,
        unlocked: false,
      },
    ],
  },
];

describe('TipsScreen', () => {
  it('renders categories and locked entradas (market/odd visible, justification hidden)', async () => {
    const api = { get: vi.fn().mockResolvedValue(feed), post: vi.fn() };
    render(<TipsScreen api={api as never} onBuyCredits={vi.fn()} />);

    expect(await screen.findByText('Futebol')).toBeInTheDocument();
    expect(screen.getByText(/Resultado Final/)).toBeInTheDocument();
    expect(screen.getByText('1.85')).toBeInTheDocument();
    expect(screen.queryByTestId('justification-e1')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /destravar/i }),
    ).toBeInTheDocument();
  });

  it('unlocks an entrada and reveals the justification', async () => {
    const user = userEvent.setup();
    const api = {
      get: vi.fn().mockResolvedValue(feed),
      post: vi.fn().mockResolvedValue({
        id: 'e1',
        justification: 'Casa joga melhor em casa.',
        unlocked: true,
      }),
    };
    render(<TipsScreen api={api as never} onBuyCredits={vi.fn()} />);

    await screen.findByText('Futebol');
    await user.click(screen.getByRole('button', { name: /destravar/i }));

    expect(api.post).toHaveBeenCalledWith('/tips/entradas/e1/unlock', {});
    expect(await screen.findByTestId('justification-e1')).toHaveTextContent(
      'Casa joga melhor em casa.',
    );
  });

  it('shows buy-credits CTA when unlock fails with 402', async () => {
    const user = userEvent.setup();
    const onBuyCredits = vi.fn();
    const err = Object.assign(new Error('no credits'), { status: 402 });
    const api = {
      get: vi.fn().mockResolvedValue(feed),
      post: vi.fn().mockRejectedValue(err),
    };
    render(<TipsScreen api={api as never} onBuyCredits={onBuyCredits} />);

    await screen.findByText('Futebol');
    await user.click(screen.getByRole('button', { name: /destravar/i }));

    const cta = await screen.findByRole('button', { name: /comprar créditos/i });
    await user.click(cta);
    await waitFor(() => expect(onBuyCredits).toHaveBeenCalled());
  });

  it('surfaces an error message when unlock fails for a non-402 reason', async () => {
    const user = userEvent.setup();
    const err = Object.assign(new Error('boom'), { status: 500 });
    const api = {
      get: vi.fn().mockResolvedValue(feed),
      post: vi.fn().mockRejectedValue(err),
    };
    render(<TipsScreen api={api as never} onBuyCredits={vi.fn()} />);

    await screen.findByText('Futebol');
    await user.click(screen.getByRole('button', { name: /destravar/i }));

    expect(await screen.findByText(/não foi possível destravar/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /comprar créditos/i }),
    ).not.toBeInTheDocument();
  });

  it('shows a load error when the feed request fails', async () => {
    const api = {
      get: vi.fn().mockRejectedValue(new Error('network')),
      post: vi.fn(),
    };
    render(<TipsScreen api={api as never} onBuyCredits={vi.fn()} />);

    expect(
      await screen.findByText(/não foi possível carregar as entradas/i),
    ).toBeInTheDocument();
  });
});
