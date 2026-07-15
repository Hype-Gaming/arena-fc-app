// web/src/screens/LoginScreen.tsx — replica of the reference /login
import { useEffect, useState, type FormEvent } from 'react';
import type { ApiClient } from '../lib/apiClient';
import type { Tokens } from '../lib/tokenStorage';
import { CHECKOUT_URL } from '../lib/checkout';
import './LoginScreen.css';

interface Props {
  api: Pick<ApiClient, 'post'>;
  onLogin: (tokens: Tokens) => void;
}

const SUPPORT_URL =
  (import.meta.env.VITE_SUPPORT_URL as string | undefined) ??
  'https://wa.me/5500000000000';

type Tone = 'ia' | 'pro' | 'basic';

interface Slide {
  tone: Tone;
  pill: string;
  odd: string;
  title: string;
  sub: string;
  meta: string;
  foot: string;
}

// Mirrors the reference carousel: IA Tipster + recent validated entries.
const SLIDES: Slide[] = [
  {
    tone: 'ia',
    pill: 'IA Tipster',
    odd: '1.67',
    title: 'Crie suas proprias odds',
    sub: 'Analise de IA em segundos',
    meta: 'R$ 100 -> R$ 167',
    foot: 'Disponivel dentro do app',
  },
  {
    tone: 'pro',
    pill: 'PRO',
    odd: '1.67',
    title: 'Maxline Rogachev x U Craiova',
    sub: 'Menos de 9.5 escanteios',
    meta: 'R$ 100 -> R$ 167',
    foot: 'Entrada de ontem bateu',
  },
  {
    tone: 'pro',
    pill: 'PRO',
    odd: '1.65',
    title: 'Ponte Preta x Criciuma',
    sub: 'Bilhete Especial',
    meta: 'R$ 100 -> R$ 165',
    foot: 'Entrada de ontem bateu',
  },
  {
    tone: 'basic',
    pill: 'BÁSICO',
    odd: '1.50',
    title: 'Ponte Preta x Criciuma',
    sub: 'Menos de 6.5 Cartoes',
    meta: 'R$ 100 -> R$ 150',
    foot: 'Entrada de ontem bateu',
  },
  {
    tone: 'basic',
    pill: 'BÁSICO',
    odd: '1.47',
    title: 'Real Oruro x FC Universitario de Vinto',
    sub: 'Mais de 2.5 gols',
    meta: 'R$ 100 -> R$ 147',
    foot: 'Entrada de ontem bateu',
  },
  {
    tone: 'basic',
    pill: 'BÁSICO',
    odd: '1.45',
    title: 'Maxline Rogachev x U Craiova',
    sub: 'Bilhete Especial',
    meta: 'R$ 100 -> R$ 145',
    foot: 'Entrada de ontem bateu',
  },
];

const INITIAL_SLIDE = 4;

function Sparkles() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4M22 5h-4M4 17v2M5 18H3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function Brand() {
  return (
    <header className="pf-brand">
      <span className="pf-logo" aria-label="Arena FC App">
        <img className="pf-logo__mark" src="/logo-simplificada.png" alt="" />
        <span className="pf-word" aria-hidden="true">
          <b className="pf-word__a">ARENA</b>
          <b className="pf-word__fc">FC</b>
          <span className="pf-word__app">APP</span>
        </span>
      </span>
    </header>
  );
}

export function LoginScreen({ api, onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [slide, setSlide] = useState(INITIAL_SLIDE);

  useEffect(() => {
    const reduce = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (reduce) return;
    const id = setInterval(
      () => setSlide((s) => (s + 1) % SLIDES.length),
      5000,
    );
    return () => clearInterval(id);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // Email-only login: a valid email enters the app (free user by default;
      // a paid plan comes from the Payt purchase tied to this email).
      const tokens = await api.post<Tokens>('/auth/login', { email });
      onLogin(tokens);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="pf-login">
      {/* ambient light trails, as in the reference */}
      <div className="pf-trails" aria-hidden="true">
        <div className="pf-trail pf-trail--1" />
        <div className="pf-trail pf-trail--2" />
      </div>

      <div className="pf-login__inner">
        <Brand />

        <>
            <div className="pf-promo">
              <div className="pf-viewport">
                <div
                  className="pf-track"
                  style={{ transform: `translateX(-${slide * 100}%)` }}
                >
                  {SLIDES.map((s, i) => (
                    <div
                      className="pf-slide"
                      key={`${s.pill}-${s.odd}-${s.title}`}
                    >
                      <article
                        className={
                          i === 0 ? 'pf-card pf-card--shine' : 'pf-card'
                        }
                        data-tone={s.tone}
                      >
                        <div className="pf-card__row pf-card__row--top">
                          <span className="pf-pill" data-tone={s.tone}>
                            {s.tone === 'ia' && <Sparkles />}
                            {s.pill}
                          </span>
                          <span className="pf-card__odd" data-tone={s.tone}>
                            {s.odd}
                          </span>
                        </div>
                        <div className="pf-card__body">
                          <div className="pf-card__title-row">
                            <p className="pf-card__title">{s.title}</p>
                            <span className="pf-card__meta">{s.meta}</span>
                          </div>
                          <div className="pf-card__sub-row">
                            <p className="pf-card__sub">{s.sub}</p>
                          </div>
                        </div>
                        <div className="pf-card__foot" data-tone={s.tone}>
                          {s.tone === 'ia' ? <Sparkles /> : <CheckIcon />}
                          {s.foot}
                        </div>
                      </article>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pf-dots" role="tablist" aria-label="Destaques">
                {SLIDES.map((sl, i) => (
                  <button
                    key={`${sl.pill}-${sl.odd}-${sl.title}`}
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

            <form className="pf-form" onSubmit={submit}>
              <div className="pf-field">
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
              </div>
              {error && (
                <p className="pf-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="pf-btn pf-btn--primary"
                type="submit"
                disabled={busy || email.trim() === ''}
              >
                {busy ? 'Enviando…' : 'Acessar a Arena'}
              </button>
            </form>

            <button
              type="button"
              className="pf-btn pf-btn--ghost"
              onClick={() => window.open(CHECKOUT_URL, '_blank')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="pf-cart"
              >
                <circle cx="8" cy="21" r="1" />
                <circle cx="19" cy="21" r="1" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>
              Adquirir acesso
            </button>

            <div className="pf-stats">
              <div className="pf-stat">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>+50.000 apostadores</span>
              </div>
              <div className="pf-stat">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                  <path d="M13 5v2M13 17v2M13 11v2" />
                </svg>
                <span>+10 entradas por dia</span>
              </div>
            </div>

            <footer className="pf-foot">
              <p className="pf-foot__terms">
                Ao continuar, você concorda com nossos{' '}
                <a href="#termos">Termos e Privacidade</a>
              </p>
              <div className="pf-foot__sep">
                <a href="#termos">Termos e Privacidade</a>
                <span className="pf-foot__bar">|</span>
                <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
                  Suporte
                </a>
              </div>
              <p className="pf-foot__age">18+ • Jogue com responsabilidade.</p>
            </footer>
          </>
      </div>
    </main>
  );
}
