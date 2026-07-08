import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginScreen } from './LoginScreen';

describe('LoginScreen', () => {
  it('logs in with the entered email and calls onLogin with the tokens', async () => {
    const user = userEvent.setup();
    const api = {
      post: vi.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r' }),
    };
    const onLogin = vi.fn();
    render(<LoginScreen api={api as never} onLogin={onLogin} />);

    await user.type(screen.getByLabelText(/e-mail/i), 'a@b.com');
    await user.click(screen.getByRole('button', { name: /acessar/i }));

    expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com' });
    expect(onLogin).toHaveBeenCalledWith({ accessToken: 'a', refreshToken: 'r' });
  });

  it('shows an error message when login fails', async () => {
    const user = userEvent.setup();
    const api = {
      post: vi.fn().mockRejectedValue(new Error('E-mail inválido')),
    };
    render(<LoginScreen api={api as never} onLogin={vi.fn()} />);

    await user.type(screen.getByLabelText(/e-mail/i), 'a@b.com');
    await user.click(screen.getByRole('button', { name: /acessar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/inválido/i);
  });

  it('does not show a code step (email-only login)', async () => {
    const user = userEvent.setup();
    const api = {
      post: vi.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r' }),
    };
    render(<LoginScreen api={api as never} onLogin={vi.fn()} />);

    await user.type(screen.getByLabelText(/e-mail/i), 'a@b.com');
    await user.click(screen.getByRole('button', { name: /acessar/i }));

    expect(screen.queryByLabelText(/código/i)).not.toBeInTheDocument();
  });
});
