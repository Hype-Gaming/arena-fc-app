// web/src/components/Onboarding.tsx — first-access activation wizard for buyers.
// Mirrors the reference funnel: Hub → Tour → Home-screen shortcut → Telegram
// activation (mandatory) → Ready. Only paid users who haven't activated on
// Telegram see it; the last step starts the 10-minute unlock timer.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ApiClient } from '../lib/apiClient';
import { useTelegramGate } from '../lib/useTelegramGate';
import { useInstallPrompt } from '../lib/useInstallPrompt';
import './Onboarding.css';

const TELEGRAM_BOT_ONBOARDING_URL = 'https://t.me/arenaofc_bot?start=onboarding';
const TELEGRAM_URL =
  (import.meta.env.VITE_TELEGRAM_URL as string | undefined) ??
  TELEGRAM_BOT_ONBOARDING_URL;
const TOUR_VIDEO_URL = import.meta.env.VITE_ONBOARDING_TOUR_URL as
  | string
  | undefined;

const STEPS = [
  { key: 'hub', num: 1, title: 'Tour do App', sub: 'Em 1 minuto você vê tudo que comprou.', icon: 'compass' },
  { key: 'shortcut', num: 2, title: 'Atalho no celular', sub: 'Arena FC pronto, com um toque no seu celular.', icon: 'phone' },
  { key: 'telegram', num: 3, title: 'Liberação do acesso', sub: 'Um detalhe rápido pra destravar tudo.', icon: 'unlock' },
  { key: 'ready', num: 4, title: 'Pronto pra usar', sub: 'Você sai daqui já usando o app.', icon: 'rocket' },
] as const;

// Screen order: hub(0) → tour(1) → shortcut(2) → telegram(3) → ready(4).
const TOTAL = 5;

// Decorative filler icons for the home-screen mockup, so the phone looks like a
// real device (generic apps) with the Arena FC icon standing out among them.
const g = (children: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
interface GenericApp { bg: string; glyph: ReactNode }
const GRID_APPS: GenericApp[] = [
  { bg: 'linear-gradient(145deg,#34d399,#059669)', glyph: g(<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />) }, // messages
  { bg: 'linear-gradient(145deg,#60a5fa,#2563eb)', glyph: g(<><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" /><circle cx="12" cy="13" r="3" /></>) }, // camera
  { bg: 'linear-gradient(145deg,#f472b6,#db2777)', glyph: g(<><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>) }, // music
  { bg: 'linear-gradient(145deg,#fb923c,#ea580c)', glyph: g(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>) }, // calendar
  { bg: 'linear-gradient(145deg,#22d3ee,#0891b2)', glyph: g(<><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>) }, // maps
  { bg: 'linear-gradient(145deg,#a78bfa,#7c3aed)', glyph: g(<><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>) }, // photos
  { bg: 'linear-gradient(145deg,#f87171,#dc2626)', glyph: g(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>) }, // clock
  { bg: 'linear-gradient(145deg,#94a3b8,#475569)', glyph: g(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V22a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 6 20.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H2a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 3.7 6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H8a1.7 1.7 0 0 0 1-1.5V2a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V8a1.7 1.7 0 0 0 1.5 1H22a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>) }, // settings
];
const DOCK_APPS: GenericApp[] = [
  { bg: 'linear-gradient(145deg,#4ade80,#16a34a)', glyph: g(<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />) }, // phone
  { bg: 'linear-gradient(145deg,#38bdf8,#0284c7)', glyph: g(<><path d="M4 4h16v16H4z" /><path d="m22 6-10 7L2 6" /></>) }, // mail
  { bg: 'linear-gradient(145deg,#818cf8,#4f46e5)', glyph: g(<><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z" /></>) }, // browser
];

export function Onboarding({ api }: { api?: Pick<ApiClient, 'get' | 'post'> } = {}) {
  const { state, click } = useTelegramGate(api);
  const install = useInstallPrompt();
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState(0);
  const [iosHint, setIosHint] = useState(false);
  const started = useRef(false);

  // Open once for a paid buyer who hasn't activated on Telegram yet. Keyed on
  // server state (not localStorage), so it re-shows until they activate.
  useEffect(() => {
    if (started.current) return;
    if (state?.applies && !state.clicked) {
      started.current = true;
      setOpen(true);
      setScreen(0);
    }
  }, [state]);

  if (!open) return null;

  function go(n: number) {
    setScreen(Math.max(0, Math.min(TOTAL - 1, n)));
  }

  async function activate() {
    await click(); // records the click → starts the 10-min unlock timer
    window.open(TELEGRAM_URL, '_blank');
    go(4);
  }

  async function onAddToHome() {
    if (install.isIOS) {
      setIosHint(true);
      return;
    }
    const r = await install.promptInstall();
    if (r === 'unavailable') setIosHint(true); // no prompt → show manual steps
  }

  return (
    <div className="onb" role="dialog" aria-modal="true" aria-label="Ativação da conta">
      <div className="onb__inner">
        <Dots active={screen} total={TOTAL} />

        {screen === 0 && (
          <section className="onb__panel onb__hub">
            <span className="onb__badge onb__badge--green"><Trophy /></span>
            <span className="onb__pill">✳ VAMOS COMEÇAR</span>
            <h2 className="onb__title">
              OLÁ, <span className="onb__accent">SEJA BEM-VINDO.</span>
            </h2>
            <p className="onb__sub">Sua conta está pronta. Ative o acesso em poucos minutos.</p>
            <span className="onb__chip"><Dot /> ≈3 minutos · tudo dentro do app</span>

            <ul className="onb__list">
              {STEPS.map((s) => (
                <li className="onb__item" key={s.key}>
                  <span className="onb__item-ico"><StepIcon name={s.icon} /><i>{s.num}</i></span>
                  <span className="onb__item-txt">
                    <b>{s.title}</b>
                    <small>{s.sub}</small>
                  </span>
                  <Chevron />
                </li>
              ))}
            </ul>

            <button type="button" className="onb__cta" onClick={() => go(1)}>
              Começar <Arrow />
            </button>
          </section>
        )}

        {screen === 1 && (
          <section className="onb__panel">
            <span className="onb__pill">✳ TOUR DO APP</span>
            <h2 className="onb__title">EM 1 MIN VOCÊ VÊ TUDO</h2>
            <p className="onb__sub">Dá o play e eu te mostro por dentro o que você acabou de comprar.</p>
            <div className="onb__video">
              {TOUR_VIDEO_URL ? (
                <video className="onb__video-el" src={TOUR_VIDEO_URL} controls playsInline />
              ) : (
                <div className="onb__video-ph">
                  <Play />
                  <b>Vídeo em breve</b>
                  <small>O tour do app entra aqui.</small>
                </div>
              )}
            </div>
            <Nav onBack={() => go(0)} onNext={() => go(2)} nextLabel="Próximo passo" />
          </section>
        )}

        {screen === 2 && (
          <section className="onb__panel">
            <span className="onb__pill">✳ ACESSO RÁPIDO AO APP</span>
            <h2 className="onb__title">ARENA FC NO SEU CELULAR.</h2>
            <p className="onb__sub">Você abre com um toque, sem precisar procurar.</p>
            <div className="onb__install-preview" aria-hidden="true">
              <div className="onb__phone">
                <div className="onb__phone-top">
                  <span>9:41</span>
                  <i />
                  <span className="onb__phone-signal">● ◒</span>
                </div>
                <span className="onb__phone-label">SUA TELA INICIAL</span>
                <div className="onb__grid">
                  {GRID_APPS.map((app, i) => (
                    <span
                      key={i}
                      className="onb__app onb__app--generic"
                      style={{ background: app.bg }}
                    >
                      {app.glyph}
                    </span>
                  ))}
                  <span className="onb__app-wrap">
                    <span className="onb__app onb__app--brand">
                      <img src="/logo-simplificada.png" alt="" />
                    </span>
                    <b>ARENA FC</b>
                  </span>
                </div>
                <div className="onb__dock">
                  {DOCK_APPS.map((app, i) => (
                    <i key={i} style={{ background: app.bg }}>
                      {app.glyph}
                    </i>
                  ))}
                </div>
              </div>
              <span className="onb__phone-callout"><Check /> Acesso em 1 toque</span>
            </div>
            {install.installed ? (
              <p className="onb__ok"><Check /> App já está na sua tela inicial.</p>
            ) : (
              <button type="button" className="onb__cta" onClick={onAddToHome}>
                <Download /> Adicionar à tela inicial
              </button>
            )}
            {iosHint && (
              <p className="onb__hint">
                No iPhone: toque em <b>Compartilhar</b> → <b>Adicionar à Tela de Início</b>.
              </p>
            )}
            {!install.installed && !iosHint && (
              <div className="onb__install-tip">
                <span className="onb__install-tip-ico"><Download /></span>
                <span>
                  <b>{install.isIOS ? 'Instalação no iPhone' : 'Instalação rápida e segura'}</b>
                  <small>
                    {install.isIOS
                      ? 'Use Compartilhar e selecione “Adicionar à Tela de Início”.'
                      : 'Não ocupa quase espaço e abre como um aplicativo.'}
                  </small>
                </span>
              </div>
            )}
            <span className="onb__os">DISPONÍVEL PARA iOS E ANDROID</span>
            <Nav onBack={() => go(1)} onNext={() => go(3)} nextLabel="Próximo passo" />
          </section>
        )}

        {screen === 3 && (
          <section className="onb__panel onb__panel--tg">
            <span className="onb__badge onb__badge--blue"><Lock /></span>
            <span className="onb__pill onb__pill--blue">✓ ÚLTIMA ETAPA</span>
            <h2 className="onb__title">
              ATIVE NO <span className="onb__tg">TELEGRAM</span> E LIBERE <span className="onb__accent">TUDO.</span>
            </h2>
            <p className="onb__sub">
              Esse é o <b>único passo</b> que falta. Sem ativar no Telegram, o app fica{' '}
              <b className="onb__danger">bloqueado</b>.
            </p>
            <div className="onb__note">
              <Clock /> Depois de falar com o bot, o app libera em <b>até 10 minutos</b>.
            </div>
            <button type="button" className="onb__cta onb__cta--blue" onClick={activate}>
              <Send /> Ativar minha conta
            </button>
            <span className="onb__cannot">Você não pode pular essa etapa.</span>
            <button type="button" className="onb__back onb__back--sole" onClick={() => go(2)}>
              <ArrowLeft /> Voltar
            </button>
          </section>
        )}

        {screen === 4 && (
          <section className="onb__panel">
            <span className="onb__badge onb__badge--green"><Rocket /></span>
            <span className="onb__pill">✳ PRONTO PRA USAR</span>
            <h2 className="onb__title">TUDO CERTO!</h2>
            <p className="onb__sub">
              Você já pode explorar o app. As funções liberam automaticamente assim que o
              Telegram confirmar (até 10 minutos).
            </p>
            <a
              className="onb__cta onb__cta--blue"
              href={TELEGRAM_BOT_ONBOARDING_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Send /> Verificar bot no Telegram
            </a>
            <button type="button" className="onb__cta" onClick={() => setOpen(false)}>
              Começar a usar <Arrow />
            </button>
          </section>
        )}
      </div>
    </div>
  );
}

function Nav({ onBack, onNext, nextLabel }: { onBack: () => void; onNext: () => void; nextLabel: string }) {
  return (
    <div className="onb__nav">
      <button type="button" className="onb__back" onClick={onBack}>
        <ArrowLeft /> Voltar
      </button>
      <button type="button" className="onb__next" onClick={onNext}>
        {nextLabel} <Arrow />
      </button>
    </div>
  );
}

function Dots({ active, total }: { active: number; total: number }) {
  return (
    <div className="onb__dots" aria-hidden="true">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={i === active ? 'onb__d onb__d--on' : i < active ? 'onb__d onb__d--done' : 'onb__d'} />
      ))}
    </div>
  );
}

/* ---- icons ---- */
function StepIcon({ name }: { name: string }) {
  if (name === 'compass') return <Compass />;
  if (name === 'phone') return <Phone />;
  if (name === 'unlock') return <UnlockIco />;
  return <Rocket />;
}
const svg = (children: ReactNode, size = 18) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
function Trophy() { return svg(<><path d="M7 4h10v4a5 5 0 0 1-10 0V4z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3M12 13v3M9 20h6M10 20l.5-2.5h3L14 20" /></>, 22); }
function Rocket() { return svg(<><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /></>, 22); }
function Compass() { return svg(<><circle cx="12" cy="12" r="10" /><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" /></>); }
function Phone() { return svg(<><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></>); }
function UnlockIco() { return svg(<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0" /></>); }
function Lock() { return svg(<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>, 22); }
function Chevron() { return svg(<path d="m9 18 6-6-6-6" />, 16); }
function Arrow() { return svg(<path d="M5 12h14M12 5l7 7-7 7" />, 16); }
function ArrowLeft() { return svg(<path d="M19 12H5M12 19l-7-7 7-7" />, 16); }
function Clock() { return svg(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, 16); }
function Send() { return svg(<path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />, 17); }
function Download() { return svg(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5M12 15V3" /></>, 17); }
function Play() { return svg(<><circle cx="12" cy="12" r="10" /><path d="m10 8 6 4-6 4V8z" fill="currentColor" /></>, 34); }
function Check() { return svg(<path d="M20 6 9 17l-5-5" />, 16); }
function Dot() { return <span className="onb__livedot" />; }
