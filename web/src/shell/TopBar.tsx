// web/src/shell/TopBar.tsx — global app top bar (logo + quick actions).
// The back arrow returns to the sport page (/bilhetes); it hides while already
// there so it never points at the current screen. The right-side actions depend
// on the plan: free users get "Resgatar Odd Grátis" (Telegram popup); paid users
// (premium/diamante) get "Criar Odds" and "Planos".
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api as defaultApi, type ApiClient } from '../lib/apiClient';
import { FreeOddModal } from './FreeOddModal';
import './TopBar.css';

interface MeProfile {
  planKey: string;
}

export function TopBar({ api = defaultApi }: { api?: Pick<ApiClient, 'get'> }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onSport = pathname === '/bilhetes';

  const [planKey, setPlanKey] = useState<string | null>(null);
  const [freeOddOpen, setFreeOddOpen] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get<MeProfile>('/me')
      .then((me) => {
        if (active) setPlanKey(me.planKey);
      })
      .catch(() => {
        /* unknown plan → show no plan-specific actions rather than guessing */
      });
    return () => {
      active = false;
    };
  }, [api]);

  const isFree = planKey === 'free';
  const isPaid = planKey === 'premium' || planKey === 'diamante';

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <div className="topbar__left">
          {!onSport && (
            <button
              type="button"
              className="topbar__back"
              aria-label="Voltar para os esportes"
              onClick={() => navigate('/bilhetes')}
            >
              <ArrowLeft />
            </button>
          )}
          <button
            type="button"
            className="topbar__logo"
            aria-label="Arena FC — Início"
            onClick={() => navigate('/')}
          >
            <img className="topbar__logo-img" src="/logo-simplificada.png" alt="" />
          </button>
        </div>
        <div className="topbar__right">
          {isFree && (
            <button
              type="button"
              className="topbar__pill topbar__pill--free"
              onClick={() => setFreeOddOpen(true)}
            >
              <PaperPlane /> Resgatar Odd Grátis
            </button>
          )}
          {isPaid && (
            <>
              <button
                type="button"
                className="topbar__pill"
                onClick={() => navigate('/tipster')}
              >
                <Sparkles /> Criar Odds
              </button>
              <button
                type="button"
                className="topbar__pill"
                onClick={() => navigate('/planos')}
              >
                <Sparkles /> Planos
              </button>
            </>
          )}
        </div>
      </div>

      <FreeOddModal open={freeOddOpen} onClose={() => setFreeOddOpen(false)} />
    </header>
  );
}

function PaperPlane() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path
        d="M20.7 4.2 3.8 10.7c-1.1.4-1.1 1.1-.2 1.4l4.3 1.3 1.7 5.2c.2.6.3.8.7.8.3 0 .5-.1.8-.4l2.1-2 4.4 3.2c.8.5 1.4.3 1.6-.8l2.9-13.6c.3-1.2-.4-1.8-1.4-1.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

/* ---- icons ---- */
function ArrowLeft() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}
export function ArenaBadge({ className = 'topbar__hex' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <polygon
        points="26,8 74,8 98,50 74,92 26,92 2,50"
        fill="#ffffff"
        stroke="#ffffff"
        strokeWidth="9"
        strokeLinejoin="round"
      />
      {/* Stroke-based italic "A" — no font dependency, crisp at any size. */}
      <g
        transform="skewX(-8) translate(6 0)"
        stroke="#18232f"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M50 26 L33 74 M50 26 L67 74" />
        <path d="M40 58 L60 58" />
      </g>
    </svg>
  );
}
const HexBadge = ArenaBadge;

/** "ARENA FC" wordmark — neon-green ARENA + white FC, italic. */
export function ArenaWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`brandmark ${className}`.trim()} aria-label="Arena FC">
      <span className="brandmark__arena">ARENA</span>
      <span className="brandmark__fc">FC</span>
    </span>
  );
}
function Sparkles() {
  return (
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
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4M22 5h-4M4 17v2M5 18H3" />
    </svg>
  );
}
