// web/src/screens/LoginScreen.tsx
import { useState, type FormEvent } from 'react';
import type { ApiClient } from '../lib/apiClient';
import type { Tokens } from '../lib/tokenStorage';

interface Props {
  api: Pick<ApiClient, 'post'>;
  onLogin: (tokens: Tokens) => void;
}

export function LoginScreen({ api, onLogin }: Props) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post('/auth/request-code', { email });
      setStep('code');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const tokens = await api.post<Tokens>('/auth/verify', { email, code });
      onLogin(tokens);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <h1>Tips</h1>
      {error && (
        <p role="alert" style={{ color: 'var(--color-gold)' }}>
          {error}
        </p>
      )}
      {step === 'email' ? (
        <form onSubmit={requestCode}>
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={busy}>
            Enviar código
          </button>
        </form>
      ) : (
        <form onSubmit={verify}>
          <label htmlFor="code">Código</label>
          <input
            id="code"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <button type="submit" disabled={busy}>
            Entrar
          </button>
        </form>
      )}
    </main>
  );
}
