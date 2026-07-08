import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FreeOddCta } from './FreeOddCta';

describe('FreeOddCta', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the "Resgatar Odd Grátis" button for free users', async () => {
    const api = { get: vi.fn().mockResolvedValue({ planKey: 'free' }) };
    render(<FreeOddCta api={api as never} />);

    expect(
      await screen.findByRole('button', { name: /resgatar odd grátis/i }),
    ).toBeInTheDocument();
  });

  it('renders nothing for paid users', async () => {
    const api = { get: vi.fn().mockResolvedValue({ planKey: 'premium' }) };
    render(<FreeOddCta api={api as never} />);

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/me'));
    expect(
      screen.queryByRole('button', { name: /resgatar odd grátis/i }),
    ).not.toBeInTheDocument();
  });

  it('opens the popup and its CTA sends the user to the Telegram group', async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    const api = { get: vi.fn().mockResolvedValue({ planKey: 'free' }) };
    render(<FreeOddCta api={api as never} />);

    await user.click(
      await screen.findByRole('button', { name: /resgatar odd grátis/i }),
    );

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/resgate sua odd grátis hoje/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/grupo do telegram/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /resgatar odd grátis/i }));

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy.mock.calls[0][0]).toMatch(/t\.me|telegram/i);
    expect(openSpy.mock.calls[0][1]).toBe('_blank');
  });
});
