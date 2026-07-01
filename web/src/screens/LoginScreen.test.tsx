import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginScreen } from './LoginScreen';

describe('LoginScreen', () => {
  it('requests a code for the entered email then shows the code step', async () => {
    const user = userEvent.setup();
    const api = {
      post: vi.fn().mockResolvedValue({}),
    };
    const onLogin = vi.fn();
    render(<LoginScreen api={api as never} onLogin={onLogin} />);

    await user.type(screen.getByLabelText(/e-mail/i), 'a@b.com');
    await user.click(screen.getByRole('button', { name: /acessar/i }));

    expect(api.post).toHaveBeenCalledWith('/auth/request-code', {
      email: 'a@b.com',
    });
    expect(await screen.findByLabelText(/código/i)).toBeInTheDocument();
  });

  it('verifies the code and calls onLogin with the returned tokens', async () => {
    const user = userEvent.setup();
    const api = {
      post: vi
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ accessToken: 'a', refreshToken: 'r' }),
    };
    const onLogin = vi.fn();
    render(<LoginScreen api={api as never} onLogin={onLogin} />);

    await user.type(screen.getByLabelText(/e-mail/i), 'a@b.com');
    await user.click(screen.getByRole('button', { name: /acessar/i }));

    await user.type(await screen.findByLabelText(/código/i), '123456');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(api.post).toHaveBeenLastCalledWith('/auth/verify', {
      email: 'a@b.com',
      code: '123456',
    });
    expect(onLogin).toHaveBeenCalledWith({
      accessToken: 'a',
      refreshToken: 'r',
    });
  });

  it('shows an error message when verify fails', async () => {
    const user = userEvent.setup();
    const api = {
      post: vi
        .fn()
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Código inválido')),
    };
    render(<LoginScreen api={api as never} onLogin={vi.fn()} />);

    await user.type(screen.getByLabelText(/e-mail/i), 'a@b.com');
    await user.click(screen.getByRole('button', { name: /acessar/i }));
    await user.type(await screen.findByLabelText(/código/i), '000000');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/inválido/i);
  });
});
