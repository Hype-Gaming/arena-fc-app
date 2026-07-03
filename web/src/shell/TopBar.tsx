// web/src/shell/TopBar.tsx — global app top bar (logo + quick actions).
// The back arrow returns to the sport page (/bilhetes); it hides while already
// there so it never points at the current screen.
import { useLocation, useNavigate } from 'react-router-dom';
import './TopBar.css';

export function TopBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onSport = pathname === '/bilhetes';

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
            aria-label="Início"
            onClick={() => navigate('/')}
          >
            <HexBadge />
          </button>
        </div>
        <div className="topbar__right">
          <button
            type="button"
            className="topbar__pill topbar__pill--secondary"
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
        </div>
      </div>
    </header>
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
function HexBadge() {
  return (
    <svg className="topbar__hex" viewBox="0 0 100 100" aria-hidden="true">
      <polygon
        points="26,8 74,8 98,50 74,92 26,92 2,50"
        fill="#0c1a27"
        stroke="#e0b341"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <text
        x="47"
        y="53"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Barlow Condensed', sans-serif"
        fontWeight="900"
        fontSize="52"
        fill="#e0b341"
      >
        P
      </text>
      <circle cx="64" cy="37" r="5" fill="#e0b341" />
    </svg>
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
