// web/src/screens/BilhetesScreen.tsx — mercados + carrossel de bilhetes
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ApiClient } from '../shared/lib/apiClient';
import { useRevalidateOnFocus } from '../shared/lib/useRevalidateOnFocus';
import { useGate } from '../shared/components/TelegramGate';
import { DEFAULT_SPORTSBOOK_URL, SportsbookFrame } from '../features/sportsbook/SportsbookFrame';
import { ExplainerModal } from './ExplainerModal';
import { CATEGORY_EXPLAINERS } from './categoryExplainers';
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
  logo?: string | null;
}

interface RailCard {
  id: string;
  cat: string;
  tierLabel: string;
  pickLabel: string;
  home: Team;
  away: Team;
  /** kickoff instant (ms since epoch) — drives the countdown + time label */
  koMs: number;
  validMs: number;
  odd: number;
  resultado: 'pending' | 'green' | 'red';
  /** opens the fixture on the sportsbook; null → fall back to the iframe */
  deepLink: string | null;
  esportivaShareUrl: string | null;
  legs: BilheteLeg[];
}

interface BilheteLeg {
  homeTeam: string;
  awayTeam: string;
  mercado: string;
  selecao: string;
  linha: number | null;
  odd: number;
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
    mercado: string | null;
    selecao: string | null;
    linha: number | null;
    homeTeam: string;
    awayTeam: string;
    homeColor: string | null;
    awayColor: string | null;
    homeLogo: string | null;
    awayLogo: string | null;
    competition: string | null;
    startsAt: string;
    validUntil: string | null;
    odd: number;
    resultado: 'pending' | 'green' | 'red';
    deepLink: string | null;
    esportivaShareUrl: string | null;
    legs: BilheteLeg[];
  }[];
}

const TIER_TONE: Record<string, string> = {
  'Básico': 'basico',
  'Pró': 'pro',
  'Ultra': 'ultra',
};

const DEFAULT_CATS: CatView[] = [
  { key: 'safes', label: 'Odds Safes', count: 0, locked: false },
  { key: 'pro', label: 'Odds Pró', count: 0, locked: false },
  { key: 'ultra', label: 'Odds Ultra', count: 0, locked: false },
  { key: 'alavancagem', label: 'Alavancagem', count: 0, locked: true },
  { key: 'multiplas', label: 'Múltiplas', count: 0, locked: true },
  { key: 'secundario', label: 'Merc. Secundário', count: 0, locked: true },
  { key: 'ligas', label: 'Ligas Americanas', count: 0, locked: true },
];

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

const team = (name: string, short: string, color: string): Team => ({ name, short, color });

const MARKET_LABELS: Record<string, string> = {
  '1x2': 'Resultado Final',
  over_under: 'Total de Gols',
  btts: 'Ambas Marcam',
  double_chance: 'Dupla Chance',
  dnb: 'Empate Anula',
};

const LAST_COUPON_STORAGE_KEY = 'tips-app:last-esportiva-coupon';

/** Only pre-filled coupons belong in the persistent sportsbook iframe. */
function prefilledCouponUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    return url.searchParams.has('shareCode') || url.searchParams.has('selections')
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function toRailCard(b: FeedResponse['bilhetes'][number]): RailCard {
  const line = b.linha == null ? '' : ` (${Number(b.linha).toFixed(2)})`;
  const market = b.mercado ? MARKET_LABELS[b.mercado] ?? b.mercado : '';
  const pick = b.selecao ? `${b.selecao}${line}` : b.titulo;
  return {
    id: b.id,
    cat: b.categoria,
    tierLabel: b.tierLabel,
    pickLabel: market ? `${market}: ${pick}` : pick,
    home: {
      ...team(b.homeTeam, shortName(b.homeTeam), b.homeColor ?? fallbackColor(b.homeTeam)),
      logo: b.homeLogo,
    },
    away: {
      ...team(b.awayTeam, shortName(b.awayTeam), b.awayColor ?? fallbackColor(b.awayTeam)),
      logo: b.awayLogo,
    },
    koMs: new Date(b.startsAt).getTime(),
    validMs: new Date(b.validUntil ?? b.startsAt).getTime(),
    odd: b.odd,
    resultado: b.resultado,
    deepLink: b.deepLink,
    esportivaShareUrl: b.esportivaShareUrl,
    legs: b.legs,
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
  const [searchParams] = useSearchParams();
  // Deep-link target from the Home cards (e.g. /bilhetes?cat=ultra) — opens that
  // category's carousel directly instead of the default first-unlocked one.
  const requestedCat = searchParams.get('cat');
  const { requireUnlock } = useGate();
  const [cats, setCats] = useState<CatView[]>(DEFAULT_CATS);
  const [all, setAll] = useState<RailCard[]>([]);
  const [cat, setCat] = useState('safes');
  const [now, setNow] = useState(() => Date.now());
  const [dot, setDot] = useState(0);
  const [explainerKey, setExplainerKey] = useState<string | null>(null);
  const [sportsbookUrl, setSportsbookUrl] = useState(() => {
    try {
      return prefilledCouponUrl(window.localStorage.getItem(LAST_COUPON_STORAGE_KEY))
        ?? DEFAULT_SPORTSBOOK_URL;
    } catch {
      return DEFAULT_SPORTSBOOK_URL;
    }
  });
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(() => new Set());
  const railRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  // Auto-pick a category only on the first load; a focus revalidation must not
  // yank the user off the category they're currently viewing.
  const initialized = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const loadFeed = useCallback(() => {
    if (!api) return;
    api
      .get<FeedResponse>('/bilhetes')
      .then((feed) => {
        setCats(feed.categorias);
        setAll(feed.bilhetes.map(toRailCard));
        if (!initialized.current) {
          // Prefer the deep-linked category (if it exists and is unlocked),
          // otherwise fall back to the first unlocked category with tickets.
          const requested = requestedCat
            ? feed.categorias.find((c) => c.key === requestedCat && !c.locked)
            : undefined;
          const firstOpen = feed.categorias.find((c) => !c.locked && c.count > 0);
          const target = requested ?? firstOpen;
          if (target) setCat(target.key);
          initialized.current = true;
        }
      })
      .catch(() => {
        // Only blank the rail on the first failed load; a transient focus
        // revalidation failure keeps whatever is already on screen.
        if (!initialized.current) setAll([]);
      });
  }, [api, requestedCat]);

  useEffect(loadFeed, [loadFeed]);
  // After returning from the checkout tab, a just-activated plan unlocks new
  // categories — revalidate so premium content appears without a manual reload.
  useRevalidateOnFocus(loadFeed);

  useEffect(() => {
    try {
      if (sportsbookUrl === DEFAULT_SPORTSBOOK_URL) {
        window.localStorage.removeItem(LAST_COUPON_STORAGE_KEY);
      } else {
        window.localStorage.setItem(LAST_COUPON_STORAGE_KEY, sportsbookUrl);
      }
    } catch {
      // Storage is optional; private browsing must not block the coupon.
    }
  }, [sportsbookUrl]);

  const cards = all.filter((c) => c.cat === cat);

  function onRailScroll() {
    const el = railRef.current;
    if (!el) return;
    const step = el.scrollWidth / Math.max(1, cards.length);
    setDot(Math.min(cards.length - 1, Math.round(el.scrollLeft / step)));
  }

  // Click-and-drag to scroll the rail sideways (native scroll only covers
  // touch/trackpad). We only start dragging past a small threshold, so a plain
  // click on "Adicionar" still works; a real drag then swallows its click.
  const drag = useRef({ down: false, startX: 0, startLeft: 0, moved: false });
  function onRailPointerDown(e: React.PointerEvent) {
    const el = railRef.current;
    if (!el) return;
    drag.current = { down: true, startX: e.clientX, startLeft: el.scrollLeft, moved: false };
  }
  function onRailPointerMove(e: React.PointerEvent) {
    const el = railRef.current;
    if (!el || !drag.current.down) return;
    const dx = e.clientX - drag.current.startX;
    if (!drag.current.moved && Math.abs(dx) > 5) {
      drag.current.moved = true;
      el.setPointerCapture?.(e.pointerId);
    }
    if (drag.current.moved) el.scrollLeft = drag.current.startLeft - dx;
  }
  function onRailPointerUp(e: React.PointerEvent) {
    if (drag.current.moved) railRef.current?.releasePointerCapture?.(e.pointerId);
    drag.current.down = false;
  }
  function onRailClickCapture(e: React.MouseEvent) {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  }

  function scrollToSportsbook() {
    const book = bookRef.current;
    if (book && typeof book.scrollIntoView === 'function') {
      book.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function pickCat(c: CatView) {
    // A locked category with an explainer (Múltiplas, Odds Altas, …) opens a
    // "how it works" popup that funnels to the plans screen, instead of jumping
    // straight to the paywall. Unlocked categories just show their tickets.
    if (c.locked && CATEGORY_EXPLAINERS[c.key]) {
      setExplainerKey(c.key);
      return;
    }
    if (c.locked) {
      navigate('/planos');
      return;
    }
    // Opening a category is a gated app function until the Telegram wait passes.
    requireUnlock(() => {
      setCat(c.key);
      setDot(0);
      railRef.current?.scrollTo?.({ left: 0 });
    });
  }

  return (
    <main className="spt">
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
            onPointerDown={onRailPointerDown}
            onPointerMove={onRailPointerMove}
            onPointerUp={onRailPointerUp}
            onPointerLeave={onRailPointerUp}
            onClickCapture={onRailClickCapture}
            aria-label="Bilhetes do mercado"
          >
            {cards.map((c) => (
              <article className="spt-card" data-tone={TIER_TONE[c.tierLabel] ?? 'ultra'} key={c.id}>
                <div className="spt-card__meta">
                  <span className="spt-card__timer">
                    <Clock /> {countdown(c.validMs, now)}
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
                  <span className="spt-card__title">{c.pickLabel}</span>
                  <span className="spt-card__odd">
                    <i>Odd</i> {c.odd.toFixed(2)}
                  </span>
                </div>

                {c.legs.length > 0 && (
                  <div className="spt-card__multiple">
                    <button
                      type="button"
                      className="spt-card__legs-toggle"
                      aria-expanded={expandedCards.has(c.id)}
                      onClick={() => setExpandedCards((ids) => {
                        const next = new Set(ids);
                        if (next.has(c.id)) next.delete(c.id);
                        else next.add(c.id);
                        return next;
                      })}
                    >
                      {expandedCards.has(c.id) ? 'Ocultar seleções' : `Ver seleções (${c.legs.length})`}
                    </button>
                    {expandedCards.has(c.id) && (
                      <ol className="spt-card__legs">
                        {c.legs.map((leg, index) => (
                          <li key={`${c.id}-${index}`}>
                            <strong>{leg.homeTeam} x {leg.awayTeam}</strong>
                            <span>{leg.mercado}: {leg.selecao}{leg.linha == null ? '' : ` (${leg.linha})`} · {leg.odd.toFixed(2)}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}

                <div className="spt-card__actions">
                  <button
                    type="button"
                    className="spt-card__add"
                    onClick={() =>
                      // Placing a bet is gated until the Telegram wait passes.
                      requireUnlock(() => {
                        // Reuse the sportsbook iframe already on this page and
                        // load the pre-filled coupon into it.
                        const destination = prefilledCouponUrl(c.esportivaShareUrl ?? c.deepLink);
                        if (destination) {
                          setCouponMessage(null);
                          setSportsbookUrl(destination);
                          window.setTimeout(
                            scrollToSportsbook,
                            0,
                          );
                        } else {
                          setCouponMessage('Este bilhete ainda não possui um cupom pré-preenchido disponível.');
                        }
                      })
                    }
                  >
                    Adicionar
                  </button>
                  <button type="button" className="spt-card__icon" aria-label="Detalhes">
                    ?
                  </button>
                  <button type="button" className="spt-card__icon" aria-label="Estatisticas">
                    <Bars />
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
          <SportsbookFrame src={sportsbookUrl} />
          {sportsbookUrl !== DEFAULT_SPORTSBOOK_URL && (
            <a className="spt-book__fallback" href={sportsbookUrl} target="_blank" rel="noopener noreferrer">
              Abrir cupom em nova aba
            </a>
          )}
          {couponMessage && <p className="spt-book__notice" role="status">{couponMessage}</p>}
        </div>
      </div>

      <ExplainerModal
        explainer={explainerKey ? CATEGORY_EXPLAINERS[explainerKey] : null}
        onClose={() => setExplainerKey(null)}
        onInterest={() => {
          setExplainerKey(null);
          navigate('/planos');
        }}
      />
    </main>
  );
}

function Crest({ team }: { team: Team }) {
  if (team.logo) {
    return (
      <span className="spt-crest spt-crest--img" aria-hidden="true">
        <img src={team.logo} alt="" loading="lazy" />
      </span>
    );
  }
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
function Bars() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19h16" />
      <path d="M7 16V9" />
      <path d="M12 16V5" />
      <path d="M17 16v-4" />
    </svg>
  );
}
