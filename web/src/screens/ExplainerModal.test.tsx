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
});
