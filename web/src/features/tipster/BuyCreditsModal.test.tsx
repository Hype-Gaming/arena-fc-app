import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BuyCreditsModal } from './BuyCreditsModal';
import { CREDIT_PACKS, checkoutUrlForPack } from '../../lib/creditPacks';

describe('BuyCreditsModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <BuyCreditsModal open={false} onClose={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('lists the four packages', () => {
    render(<BuyCreditsModal open onClose={vi.fn()} />);

    expect(
      screen.getByRole('heading', { name: /comprar cr/i }),
    ).toBeInTheDocument();

    expect(screen.getByText('Arena 5 Creditos IA')).toBeInTheDocument();
    expect(screen.getByText('5 creditos')).toBeInTheDocument();
    expect(screen.getByText('Arena 10 Creditos IA')).toBeInTheDocument();
    expect(screen.getByText('10 creditos')).toBeInTheDocument();
    expect(screen.getByText('Arena IA ilimitada por 30 dias')).toBeInTheDocument();
    expect(screen.getByText('30 dias ilimitados')).toBeInTheDocument();
    expect(screen.getByText('Arena IA ilimitada por 90 dias')).toBeInTheDocument();
    expect(screen.getByText('90 dias ilimitados')).toBeInTheDocument();
  });

  it('embeds the checkout for the clicked pack without leaving the app', async () => {
    const user = userEvent.setup();
    render(<BuyCreditsModal open onClose={vi.fn()} />);

    await user.click(screen.getByText('Arena 5 Creditos IA'));

    expect(screen.getByRole('heading', { name: /finalizar compra/i })).toBeInTheDocument();
    expect(screen.getByTitle(/checkout arena 5 creditos ia/i)).toHaveAttribute(
      'src',
      'https://checkout.payt.com.br/923698894ed467828da8395f46da1b67',
    );
    expect(screen.getByRole('link', { name: /abrir em nova aba/i })).toHaveAttribute(
      'href',
      'https://checkout.payt.com.br/923698894ed467828da8395f46da1b67',
    );
  });

  it('returns from the embedded checkout to the package list', async () => {
    const user = userEvent.setup();
    render(<BuyCreditsModal open onClose={vi.fn()} />);

    await user.click(screen.getByText('Arena 10 Creditos IA'));
    await user.click(screen.getByRole('button', { name: /voltar aos pacotes/i }));

    expect(screen.getByText('Arena 5 Creditos IA')).toBeInTheDocument();
    expect(screen.queryByTitle(/checkout/i)).not.toBeInTheDocument();
  });

  it('maps every IA package to its Payt checkout', () => {
    expect(checkoutUrlForPack(CREDIT_PACKS[0].id)).toBe(
      'https://checkout.payt.com.br/923698894ed467828da8395f46da1b67',
    );
    expect(checkoutUrlForPack(CREDIT_PACKS[1].id)).toBe(
      'https://checkout.payt.com.br/b9308e657ab39f0059e6207c2fbf6aee',
    );
    expect(checkoutUrlForPack(CREDIT_PACKS[2].id)).toBe(
      'https://checkout.payt.com.br/0c3a47a281c93d17be29146da83fb7c0',
    );
    expect(checkoutUrlForPack(CREDIT_PACKS[3].id)).toBe(
      'https://checkout.payt.com.br/9b8dcbba1f508de4d63dece33b2b5bde',
    );
  });

  it('closes on the close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<BuyCreditsModal open onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /fechar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
