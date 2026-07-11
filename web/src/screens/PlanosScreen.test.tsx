// web/src/screens/PlanosScreen.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanosScreen } from './PlanosScreen';

function makeApi(planKey: string) {
  return {
    get: vi.fn((path: string) => {
      if (path === '/me') return Promise.resolve({ planKey });
      return Promise.reject(new Error(`unexpected ${path}`));
    }),
  };
}

describe('PlanosScreen', () => {
  beforeEach(() => {
    vi.stubGlobal('open', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the three plans', async () => {
    render(<PlanosScreen api={makeApi('premium') as never} />);

    expect(await screen.findByText('Compare os planos')).toBeInTheDocument();
    expect(screen.getByLabelText('Plano Livre')).toBeInTheDocument();
    expect(screen.getByLabelText('Plano Premium')).toBeInTheDocument();
    expect(screen.getByLabelText('Plano Diamante')).toBeInTheDocument();
  });

  it('marks the current plan and offers an upgrade to a higher one', async () => {
    render(<PlanosScreen api={makeApi('premium') as never} />);

    // current plan (premium) is not upgradeable
    const premium = await screen.findByLabelText('Plano Premium');
    await waitFor(() =>
      expect(premium).toHaveAttribute('data-state', 'current'),
    );

    // higher plan shows a paid upgrade CTA
    const diamante = screen.getByLabelText('Plano Diamante');
    expect(diamante).toHaveAttribute('data-state', 'upgrade');
    expect(
      screen.getByRole('button', { name: /fazer upgrade r\$ 127/i }),
    ).toBeEnabled();
  });

  it('opens the checkout for the plan when Upgrade is clicked', async () => {
    const user = userEvent.setup();
    render(<PlanosScreen api={makeApi('premium') as never} />);

    await screen.findByText('Compare os planos');
    await user.click(
      screen.getByRole('button', { name: /fazer upgrade r\$ 127/i }),
    );

    expect(window.open).toHaveBeenCalledTimes(1);
    const [url, target] = (window.open as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://checkout.payt.com.br/10c39db1ebf3ea9668be934041c9bf94');
    expect(target).toBe('_blank');
  });

  it('defaults to Livre as current when the user is on the free plan', async () => {
    render(<PlanosScreen api={makeApi('free') as never} />);

    const livre = await screen.findByLabelText('Plano Livre');
    expect(livre).toHaveAttribute('data-state', 'current');
  });
});
