import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MultiplasModal } from './MultiplasModal';

describe('MultiplasModal', () => {
  it('renders nothing when closed', () => {
    render(<MultiplasModal open={false} onClose={vi.fn()} onInterest={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the explainer content when open', () => {
    render(<MultiplasModal open onClose={vi.fn()} onInterest={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent(/como funciona as múltiplas/i);
    expect(dialog).toHaveTextContent(/10x e 200x/i);
    expect(screen.getByRole('img', { name: /múltiplas/i })).toBeInTheDocument();
  });

  it('fires onInterest from the CTA and onClose from the close button', async () => {
    const user = userEvent.setup();
    const onInterest = vi.fn();
    const onClose = vi.fn();
    render(<MultiplasModal open onClose={onClose} onInterest={onInterest} />);

    await user.click(screen.getByRole('button', { name: /tenho interesse/i }));
    expect(onInterest).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /fechar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
