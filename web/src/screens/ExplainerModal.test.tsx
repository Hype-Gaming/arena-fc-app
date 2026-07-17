import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExplainerModal, type Explainer } from './ExplainerModal';

const explainer: Explainer = {
  title: 'Entenda como funciona as Odds Altas',
  imageSrc: '/odds-altas.png',
  imageAlt: 'Odds Altas — Arena FC',
  body: 'Entradas com odds elevadas e alto potencial de retorno.',
};

describe('ExplainerModal', () => {
  it('renders nothing when there is no explainer', () => {
    render(<ExplainerModal explainer={null} onClose={vi.fn()} onInterest={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the given explainer content', () => {
    render(<ExplainerModal explainer={explainer} onClose={vi.fn()} onInterest={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent(/odds altas/i);
    expect(dialog).toHaveTextContent(/odds elevadas/i);
    expect(screen.getByRole('img', { name: /odds altas/i })).toBeInTheDocument();
  });

  it('fires onInterest from the CTA and onClose from the close button', async () => {
    const user = userEvent.setup();
    const onInterest = vi.fn();
    const onClose = vi.fn();
    render(<ExplainerModal explainer={explainer} onClose={onClose} onInterest={onInterest} />);

    await user.click(screen.getByRole('button', { name: /tenho interesse/i }));
    expect(onInterest).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /fechar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders a configured checkout as a secure external link', async () => {
    const user = userEvent.setup();
    const onInterest = vi.fn();
    const onClose = vi.fn();
    render(
      <ExplainerModal
        explainer={{ ...explainer, checkoutUrl: 'https://checkout.example/odds-altas' }}
        onClose={onClose}
        onInterest={onInterest}
      />,
    );

    const checkout = screen.getByRole('link', { name: /tenho interesse/i });
    expect(checkout).toHaveAttribute('href', 'https://checkout.example/odds-altas');
    expect(checkout).toHaveAttribute('target', '_blank');
    expect(checkout).toHaveAttribute('rel', 'noopener noreferrer');

    await user.click(checkout);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onInterest).not.toHaveBeenCalled();
  });

  it('focuses the close button and closes with Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ExplainerModal explainer={explainer} onClose={onClose} onInterest={vi.fn()} />);

    expect(screen.getByRole('button', { name: /fechar/i })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
