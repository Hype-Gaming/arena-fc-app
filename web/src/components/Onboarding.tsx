// web/src/components/Onboarding.tsx — first-access activation wizard for buyers.
// Mirrors the reference funnel: Hub → Tour → Home-screen shortcut → Telegram
// activation (mandatory) → Ready. Only paid users who haven't activated on
// Telegram see it; the last step starts the 10-minute unlock timer.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ApiClient } from '../lib/apiClient';
import { useTelegramGate } from '../lib/useTelegramGate';
import { useInstallPrompt } from '../lib/useInstallPrompt';
import './Onboarding.css';

const TELEGRAM_URL =
  (import.meta.env.VITE_TELEGRAM_URL as string | undefined) ??
  'https://t.me/+arena_fc';
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
            <div className="onb__phone" aria-hidden="true">
              <span className="onb__phone-label">TELA INICIAL</span>
              <div className="onb__grid">
                {Array.from({ length: 9 }).map((_, i) => (
                  <span key={i} className={i === 7 ? 'onb__app onb__app--brand' : 'onb__app'}>
                    {i === 7 && <Hex />}
                  </span>
                ))}
              </div>
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
            <span className="onb__os">iOS · Android</span>
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
function Hex() { return svg(<path d="M12 2 21 7v10l-9 5-9-5V7l9-5z" />, 20); }
function Dot() { return <span className="onb__livedot" />; }
