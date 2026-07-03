// web/src/screens/BilhetesScreen.tsx — mercados + carrossel de bilhetes
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ApiClient } from '../lib/apiClient';
import { SportsbookFrame } from '../features/sportsbook/SportsbookFrame';
import './BilhetesScreen.css';

interface CatView {
  key: string;
  label: string;
  count: number;
  locked: boolean;
}

interface Team {
  name: string;
  short: string;
  color: string;
}

interface RailCard {
  id: string;
  cat: string;
  tierLabel: string;
  home: Team;
  away: Team;
  /** kickoff instant (ms since epoch) — drives the countdown + time label */
  koMs: number;
  odd: number;
  resultado: 'pending' | 'green' | 'red';
}

/** Server shape of GET /bilhetes. */
interface FeedResponse {
  plan: { key: string; rank: number };
  categorias: CatView[];
  bilhetes: {
    id: string;
    categoria: string;
    tierLabel: string;
    titulo: string;
    homeTeam: string;
    awayTeam: string;
    homeColor: string | null;
    awayColor: string | null;
    competition: string | null;
    startsAt: string;
    odd: number;
    resultado: 'pending' | 'green' | 'red';
  }[];
}

const TIER_TONE: Record<string, string> = {
  'Básico': 'basico',
  'Pró': 'pro',
  'Ultra': 'ultra',
};

/* ---- mock fallback (shown until the admin publishes real bilhetes) ---- */

const DEFAULT_CATS: CatView[] = [
  { key: 'safes', label: 'Odds Safes', count: 4, locked: false },
  { key: 'pro', label: 'Odds Pró', count: 3, locked: false },
  { key: 'ultra', label: 'Odds Ultra', count: 2, locked: false },
  { key: 'alavancagem', label: 'Alavancagem', count: 1, locked: true },
  { key: 'multiplas', label: 'Múltiplas', count: 1, locked: true },
  { key: 'secundario', label: 'Merc. Secundário', count: 3, locked: true },
  { key: 'ligas', label: 'Ligas Americanas', count: 0, locked: true },
];

const MOCK_TIER: Record<string, string> = {
  safes: 'Básico',
  pro: 'Pró',
  ultra: 'Ultra',
};

const t = (name: string, short: string, color: string): Team => ({ name, short, color });

const MOCK_SEED: {
  id: string;
  cat: string;
  home: Team;
  away: Team;
  inHours: number;
  odd: number;
}[] = [
  { id: 's1', cat: 'safes', home: t('Espanha', 'ESP', '#c60b1e'), away: t('Áustria', 'AUT', '#ed2939'), inHours: 2.2, odd: 1.53 },
  { id: 's2', cat: 'safes', home: t('Portugal', 'POR', '#006600'), away: t('Croácia', 'CRO', '#ff2400'), inHours: 6.2, odd: 1.57 },
  { id: 's3', cat: 'safes', home: t('Cuiabá', 'CUI', '#f5c518'), away: t('América Mineiro', 'AME', '#0b7a3b'), inHours: 6.2, odd: 1.47 },
  { id: 's4', cat: 'safes', home: t('Estados Unidos', 'EUA', '#3c3b6e'), away: t('Bósnia', 'BIH', '#002395'), inHours: 9.5, odd: 1.62 },
  { id: 'p1', cat: 'pro', home: t('Suíça', 'SUI', '#d52b1e'), away: t('Argélia', 'ALG', '#006233'), inHours: 12.1, odd: 2.1 },
  { id: 'p2', cat: 'pro', home: t('Austrália', 'AUS', '#012169'), away: t('Egito', 'EGY', '#ce1126'), inHours: 26.4, odd: 2.35 },
  { id: 'p3', cat: 'pro', home: t('Flamengo', 'FLA', '#e63946'), away: t('Palmeiras', 'PAL', '#1b998b'), inHours: 29.0, odd: 1.95 },
  { id: 'u1', cat: 'ultra', home: t('Inglaterra', 'ING', '#cf081f'), away: t('RD Congo', 'COD', '#007fff'), inHours: 30.2, odd: 3.4 },
  { id: 'u2', cat: 'ultra', home: t('França', 'FRA', '#0055a4'), away: t('Marrocos', 'MAR', '#c1272d'), inHours: 50.7, odd: 3.85 },
];

function buildMockCards(): RailCard[] {
  const now = Date.now();
  return MOCK_SEED.map((m) => ({
    id: m.id,
    cat: m.cat,
    tierLabel: MOCK_TIER[m.cat] ?? 'Ultra',
    home: m.home,
    away: m.away,
    koMs: now + m.inHours * 3_600_000,
    odd: m.odd,
    resultado: 'pending' as const,
  }));
}

/* ---- server mapping ---- */

const CREST_FALLBACKS = ['#c60b1e', '#006600', '#0b7a3b', '#3c3b6e', '#d52b1e', '#0055a4', '#e63946'];

function shortName(name: string): string {
  return name.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 3).toUpperCase() || '???';
}

function fallbackColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return CREST_FALLBACKS[h % CREST_FALLBACKS.length];
}

function toRailCard(b: FeedResponse['bilhetes'][number]): RailCard {
  return {
    id: b.id,
    cat: b.categoria,
    tierLabel: b.tierLabel,
    home: t(b.homeTeam, shortName(b.homeTeam), b.homeColor ?? fallbackColor(b.homeTeam)),
    away: t(b.awayTeam, shortName(b.awayTeam), b.awayColor ?? fallbackColor(b.awayTeam)),
    koMs: new Date(b.startsAt).getTime(),
    odd: b.odd,
    resultado: b.resultado,
  };
}

/* ---- time helpers ---- */

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function countdown(toMs: number, nowMs: number): string {
  const left = Math.max(0, Math.floor((toMs - nowMs) / 1000));
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function kickoffLabel(toMs: number): string {
  return new Date(toMs).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Props {
  /** When provided, the screen loads real bilhetes from GET /bilhetes. */
  api?: Pick<ApiClient, 'get'>;
}

export function BilhetesScreen({ api }: Props = {}) {
  const navigate = useNavigate();
  const [cats, setCats] = useState<CatView[]>(DEFAULT_CATS);
  const [all, setAll] = useState<RailCard[]>(buildMockCards);
  const [cat, setCat] = useState('safes');
  const [now, setNow] = useState(() => Date.now());
  const [dot, setDot] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!api) return;
    let alive = true;
    api
      .get<FeedResponse>('/bilhetes')
      .then((feed) => {
        // Until the admin publishes content, keep the demo rail on screen.
        if (!alive || feed.bilhetes.length === 0) return;
        setCats(feed.categorias);
        setAll(feed.bilhetes.map(toRailCard));
        const firstOpen = feed.categorias.find((c) => !c.locked && c.count > 0);
        if (firstOpen) setCat(firstOpen.key);
      })
      .catch(() => {
        /* mock fallback stays */
      });
    return () => {
      alive = false;
    };
  }, [api]);

  const cards = all.filter((c) => c.cat === cat);

  function onRailScroll() {
    const el = railRef.current;
    if (!el) return;
    const step = el.scrollWidth / Math.max(1, cards.length);
    setDot(Math.min(cards.length - 1, Math.round(el.scrollLeft / step)));
  }

  function pickCat(c: CatView) {
    if (c.locked) {
      navigate('/planos');
      return;
    }
    setCat(c.key);
    setDot(0);
    railRef.current?.scrollTo?.({ left: 0 });
  }

  return (
    <main className="spt">
      {/* top bar */}
      <header className="spt-top">
        <div className="spt-top__inner">
          <div className="spt-top__left">
            <button
              type="button"
              className="spt-top__back"
              aria-label="Voltar"
              onClick={() => navigate('/')}
            >
              <ArrowLeft />
            </button>
            <HexBadge />
          </div>
          <div className="spt-top__right">
            <button
              type="button"
              className="spt-pill"
              onClick={() => navigate('/tipster')}
            >
              <Sparkles /> Criar Odds
            </button>
            <button
              type="button"
              className="spt-pill"
              onClick={() => navigate('/planos')}
            >
              <Sparkles /> Planos
            </button>
          </div>
        </div>
      </header>

      <div className="spt__inner">
        <div className="spt-markets__head">
          <h1>Mercados disponíveis</h1>
          <Chevron />
        </div>

        {/* category chips */}
        <div className="spt-chips" role="tablist" aria-label="Mercados">
          {cats.map((c) => (
            <button
              key={c.key}
              type="button"
              role="tab"
              aria-selected={!c.locked && cat === c.key}
              className="spt-chip"
              data-active={!c.locked && cat === c.key}
              data-locked={c.locked}
              onClick={() => pickCat(c)}
            >
              {c.label}
              {c.locked && <Lock />}
              {c.count > 0 && <span>({c.count})</span>}
            </button>
          ))}
        </div>

        {/* horizontal card rail */}
        {cards.length === 0 ? (
          <p className="spt-empty">Nenhum bilhete publicado neste mercado ainda.</p>
        ) : (
          <div
            className="spt-rail"
            ref={railRef}
            onScroll={onRailScroll}
            aria-label="Bilhetes do mercado"
          >
            {cards.map((c) => (
              <article className="spt-card" key={c.id}>
                <div className="spt-card__meta">
                  <span className="spt-card__timer">
                    <Clock /> {countdown(c.koMs, now)}
                  </span>
                  <span
                    className="spt-card__tier"
                    data-tone={TIER_TONE[c.tierLabel] ?? 'ultra'}
                  >
                    {c.tierLabel}
                  </span>
                  <span className="spt-card__kickoff">{kickoffLabel(c.koMs)}</span>
                </div>

                <div className="spt-card__teams">
                  <div className="spt-card__team">
                    <Crest team={c.home} />
                    <span>{c.home.name}</span>
                  </div>
                  <span className="spt-card__vs">VS</span>
                  <div className="spt-card__team">
                    <Crest team={c.away} />
                    <span>{c.away.name}</span>
                  </div>
                </div>

                <div className="spt-card__row">
                  <span className="spt-card__title">Bilhete Especial</span>
                  <span className="spt-card__odd">
                    <i>Odd</i> {c.odd.toFixed(2)}
                  </span>
                </div>

                <div className="spt-card__actions">
                  <button
                    type="button"
                    className="spt-card__add"
                    onClick={() =>
                      bookRef.current?.scrollIntoView({ behavior: 'smooth' })
                    }
                  >
                    Adicionar
                  </button>
                  <button type="button" className="spt-card__icon" aria-label="Como funciona">
                    ?
                  </button>
                  <button type="button" className="spt-card__icon" aria-label="Estatísticas">
                    <ChartBars />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="spt-dots" aria-hidden="true">
          {cards.map((c, i) => (
            <span key={c.id} className="spt-dot" data-active={i === dot} />
          ))}
        </div>

        {/* embedded sportsbook */}
        <div className="spt-book" ref={bookRef}>
          <SportsbookFrame />
        </div>
      </div>
    </main>
  );
}

function Crest({ team }: { team: Team }) {
  return (
    <span
      className="spt-crest"
      style={{ ['--crest' as string]: team.color }}
      aria-hidden="true"
    >
      {team.short}
    </span>
  );
}

/* ---- inline icons ---- */
function ArrowLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}
function HexBadge() {
  return (
    <svg className="spt-top__hex" viewBox="0 0 100 100" aria-hidden="true">
      <polygon points="26,8 74,8 98,50 74,92 26,92 2,50" fill="#0c1a27" stroke="#e0b341" strokeWidth="6" strokeLinejoin="round" />
      <text x="47" y="53" textAnchor="middle" dominantBaseline="central" fontFamily="'Barlow Condensed', sans-serif" fontWeight="900" fontSize="52" fill="#e0b341">
        P
      </text>
      <circle cx="64" cy="37" r="5" fill="#e0b341" />
    </svg>
  );
}
function Sparkles() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4M22 5h-4M4 17v2M5 18H3" />
    </svg>
  );
}
function Chevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
function Lock() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
function Clock() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function ChartBars() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 21h18M7 21V9M12 21V3M17 21v-6" />
    </svg>
  );
}
