import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BuyCreditsModal } from './BuyCreditsModal';

describe('BuyCreditsModal', () => {
  beforeEach(() => {
    vi.stubGlobal('open', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <BuyCreditsModal open={false} onClose={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('lists the four packages with their prices', () => {
    render(<BuyCreditsModal open onClose={vi.fn()} />);

    expect(
      screen.getByRole('heading', { name: /comprar créditos ia/i }),
    ).toBeInTheDocument();

    expect(screen.getByText('Premier 6 Creditos IA')).toBeInTheDocument();
    expect(screen.getByText('R$ 29,90')).toBeInTheDocument();
    expect(screen.getByText('Premier 9 Creditos IA')).toBeInTheDocument();
    expect(screen.getByText('R$ 39,90')).toBeInTheDocument();
    expect(
      screen.getByText('Premier Crédito IA ilimitado por 1 mês'),
    ).toBeInTheDocument();
    expect(screen.getByText('R$ 99,00')).toBeInTheDocument();
    expect(
      screen.getByText('Premier Crédito IA ilimitado por 3 meses'),
    ).toBeInTheDocument();
    expect(screen.getByText('R$ 149,90')).toBeInTheDocument();
  });

  it('opens the checkout for the clicked pack', async () => {
    const user = userEvent.setup();
    render(<BuyCreditsModal open onClose={vi.fn()} />);

    await user.click(screen.getByText('Premier 6 Creditos IA'));

    expect(window.open).toHaveBeenCalledTimes(1);
    const [url, target] = (window.open as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(url).toContain('premier-6-creditos-ia');
    expect(target).toBe('_blank');
  });

  it('closes on the close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<BuyCreditsModal open onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /fechar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
