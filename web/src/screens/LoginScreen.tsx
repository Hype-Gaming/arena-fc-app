// web/src/screens/LoginScreen.tsx
import { useEffect, useState, type FormEvent } from 'react';
import type { ApiClient } from '../lib/apiClient';
import type { Tokens } from '../lib/tokenStorage';
import './LoginScreen.css';

interface Props {
  api: Pick<ApiClient, 'post'>;
  onLogin: (tokens: Tokens) => void;
}

const CHECKOUT_URL =
  (import.meta.env.VITE_CHECKOUT_URL as string | undefined) ??
  'https://lastlink.com';

interface Slide {
  pill: string;
  title: string;
  sub: string;
  meta: string;
  hero: string;
  foot: string;
  won?: boolean;
}

// Mirrors the reference carousel: it pages through tiered entries
// (IA Tipster / ULTRA / PRO / BÁSICO) with odds, match and a "bateu" result.
const SLIDES: Slide[] = [
  {
    pill: 'IA Tipster',
    title: 'Crie suas próprias odds',
    sub: 'Análise de IA em segundos',
    meta: 'R$ 100 → R$ 214',
    hero: '2.14',
    foot: 'Disponível dentro do app',
  },
  {
    pill: 'Ultra',
    title: 'México x Equador',
    sub: 'Visitante para mais cartões',
    meta: 'R$ 100 → R$ 214',
    hero: '2.14',
    foot: 'Entrada de ontem bateu',
    won: true,
  },
  {
    pill: 'Pro',
    title: 'Bilhete Especial',
    sub: 'Combo de 3 seleções',
    meta: 'R$ 100 → R$ 168',
    hero: '1.68',
    foot: 'Green confirmado',
    won: true,
  },
  {
    pill: 'Básico',
    title: 'Entrada do dia',
    sub: 'Uma seleção segura, todo dia',
    meta: 'R$ 100 → R$ 140',
    hero: '1.40',
    foot: 'Disponível dentro do app',
  },
];

function HexLogo() {
  return (
    <svg className="pf-logo" viewBox="0 0 100 100" aria-hidden="true">
      <polygon
        points="26,8 74,8 98,50 74,92 26,92 2,50"
        fill="#0c1a27"
        stroke="#1fd07a"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <text
        x="47"
        y="53"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Saira Condensed', sans-serif"
        fontWeight="800"
        fontSize="52"
        fill="#1fd07a"
      >
        P
      </text>
      <circle cx="64" cy="37" r="5" fill="#e8b74a" />
    </svg>
  );
}

function Spark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z" />
    </svg>
  );
}

function Check() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.16" />
      <path d="M7 12.5l3.2 3.2L17 9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Brand() {
  return (
    <header className="pf-brand">
      <div className="pf-brand__lockup">
        <HexLogo />
        <div className="pf-wordmark">
          <span className="pf-wordmark__premier">PREMIER</span>
          <span className="pf-wordmark__fc">FC</span>
          <span className="pf-wordmark__app">APP</span>
        </div>
      </div>
      <div className="pf-tagline">
        RUMO AO <b>HEXA</b>
      </div>
    </header>
  );
}

export function LoginScreen({ api, onLogin }: Props) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (step !== 'email') return;
    const reduce = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (reduce) return;
    const id = setInterval(
      () => setSlide((s) => (s + 1) % SLIDES.length),
      5000,
    );
    return () => clearInterval(id);
  }, [step]);

  const devLogin = import.meta.env.VITE_DEV_LOGIN === 'true';

  async function requestCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // Dev shortcut: skip the OTP step and log in straight from the email.
      if (devLogin) {
        const tokens = await api.post<Tokens>('/auth/dev-login', { email });
        onLogin(tokens);
        return;
      }
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

  const s = SLIDES[slide];

  return (
    <main className="pf-login">
      <div className="pf-login__inner">
        <Brand />

        {step === 'email' ? (
          <>
            <div className="pf-promo">
              <article className="pf-card">
                <div className="pf-card__body">
                  <span className="pf-pill">
                    <Spark /> {s.pill}
                  </span>
                  <span className="pf-card__odd">{s.hero}</span>
                  <h2 className="pf-card__title">{s.title}</h2>
                  <p className="pf-card__sub">{s.sub}</p>
                  <span className="pf-card__meta">{s.meta}</span>
                </div>
                <div
                  className={
                    s.won ? 'pf-card__foot pf-card__foot--won' : 'pf-card__foot'
                  }
                >
                  <span className={s.won ? 'pf-check' : 'pf-spark'}>
                    {s.won ? <Check /> : <Spark />}
                  </span>
                  {s.foot}
                </div>
              </article>
              <div className="pf-dots" role="tablist" aria-label="Destaques">
                {SLIDES.map((sl, i) => (
                  <button
                    key={sl.pill}
                    type="button"
                    className={i === slide ? 'pf-dot pf-dot--active' : 'pf-dot'}
                    aria-label={`Ver ${sl.pill}`}
                    aria-selected={i === slide}
                    role="tab"
                    onClick={() => setSlide(i)}
                  />
                ))}
              </div>
            </div>

            <form className="pf-form" onSubmit={requestCode}>
              <label className="pf-label" htmlFor="email">
                E-mail
              </label>
              <input
                id="email"
                className="pf-input"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {error && (
                <p className="pf-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="pf-btn pf-btn--primary"
                type="submit"
                disabled={busy}
              >
                {busy ? 'Enviando…' : 'Acessar o Premier'}
              </button>
            </form>

            <button
              type="button"
              className="pf-btn pf-btn--ghost"
              onClick={() => window.open(CHECKOUT_URL, '_blank')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M3 3h2l2.4 12.3a1 1 0 0 0 1 .8h9.3a1 1 0 0 0 1-.8L21 7H6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="9" cy="20" r="1.4" fill="currentColor" />
                <circle cx="18" cy="20" r="1.4" fill="currentColor" />
              </svg>
              Adquirir acesso
            </button>

            <div className="pf-stats">
              <div className="pf-stat">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 6a3 3 0 0 1 0 6M20.5 19a5 5 0 0 0-3-4.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                +50.000 apostadores
              </div>
              <div className="pf-stat">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V7z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                  <path d="M14 5v14" stroke="currentColor" strokeWidth="1.7" strokeDasharray="2 2" />
                </svg>
                +10 entradas por dia
              </div>
            </div>

            <footer className="pf-foot">
              Ao continuar, você concorda com nossos{' '}
              <a href="#termos">Termos e Privacidade</a>
              <div className="pf-foot__age">18+ • Jogue com responsabilidade</div>
              <div className="pf-foot__sep">
                <a href="#termos">Termos e Privacidade</a> &nbsp;|&nbsp;{' '}
                <a href="#suporte">Suporte no WhatsApp</a>
              </div>
            </footer>
          </>
        ) : (
          <form className="pf-form" onSubmit={verify}>
            <p className="pf-code-note">
              Enviamos um código de acesso para <b>{email}</b>.
            </p>
            <label className="pf-label" htmlFor="code">
              Código
            </label>
            <input
              id="code"
              className="pf-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            {error && (
              <p className="pf-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="pf-btn pf-btn--primary"
              type="submit"
              disabled={busy}
            >
              {busy ? 'Entrando…' : 'Entrar'}
            </button>
            <button
              type="button"
              className="pf-btn pf-btn--link"
              onClick={() => {
                setStep('email');
                setCode('');
                setError(null);
              }}
            >
              Usar outro <b>e-mail</b>
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
