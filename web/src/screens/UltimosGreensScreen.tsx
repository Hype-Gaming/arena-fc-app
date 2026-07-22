// web/src/screens/UltimosGreensScreen.tsx — "Últimos Greens": the public track
// record of tickets that already hit, grouped by date with period filters.
import { useEffect, useMemo, useState } from 'react';
import type { ApiClient } from '../shared/lib/apiClient';
import './UltimosGreensScreen.css';

interface GreenBilhete {
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
  odd: number;
  resultado: string;
}

const MARKET_LABELS: Record<string, string> = {
  '1x2': 'Resultado Final',
  over_under: 'Total de Gols',
  btts: 'Ambas Marcam',
  double_chance: 'Dupla Chance',
  dnb: 'Empate Anula',
};

const TIER_TONE: Record<string, string> = {
  'Básico': 'basico',
  'Pró': 'pro',
  'Ultra': 'ultra',
};

const FALLBACKS = ['#c60b1e', '#006600', '#0b7a3b', '#3c3b6e', '#d52b1e', '#0055a4', '#e63946'];

type Period = 'todos' | 'hoje' | 'ontem' | '7d' | '30d';

const FILTERS: { key: Period; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'hoje', label: 'Hoje' },
  { key: 'ontem', label: 'Ontem' },
  { key: '7d', label: '7 Dias' },
  { key: '30d', label: '30 Dias' },
];

function shortName(name: string): string {
  return name.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 3).toUpperCase() || '???';
}
function fallbackColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return FALLBACKS[h % FALLBACKS.length];
}
function pickLabel(b: GreenBilhete): string {
  const market = b.mercado ? MARKET_LABELS[b.mercado] ?? b.mercado : '';
  const line = b.linha == null ? '' : ` (${Number(b.linha).toFixed(2)})`;
  const pick = b.selecao ? `${b.selecao}${line}` : b.titulo;
  return market ? `${market}: ${pick}` : pick;
}

function dayKey(d: Date): string {
  return d.toLocaleDateString('pt-BR'); // dd/mm/yyyy
}
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function groupLabel(key: string, todayKey: string, yesterdayKey: string): string {
  if (key === todayKey) return 'HOJE';
  if (key === yesterdayKey) return 'ONTEM';
  return key;
}

function withinPeriod(startsAt: string, period: Period, now: Date): boolean {
  if (period === 'todos') return true;
  const d = new Date(startsAt);
  const today = startOfDay(now).getTime();
  const day = startOfDay(d).getTime();
  const DAY = 86_400_000;
  switch (period) {
    case 'hoje':
      return day === today;
    case 'ontem':
      return day === today - DAY;
    case '7d':
      return day > today - 7 * DAY;
    case '30d':
      return day > today - 30 * DAY;
  }
}

interface Props {
  api?: Pick<ApiClient, 'get'>;
}

export function UltimosGreensScreen({ api }: Props = {}) {
  const [greens, setGreens] = useState<GreenBilhete[]>([]);
  const [period, setPeriod] = useState<Period>('todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api) {
      setLoading(false);
      return;
    }
    let alive = true;
    api
      .get<GreenBilhete[]>('/bilhetes/historico')
      .then((rows) => {
        if (alive) setGreens(rows);
      })
      .catch(() => {
        /* keep empty state on failure */
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [api]);

  const now = useMemo(() => new Date(), []);
  const todayKey = dayKey(startOfDay(now));
  const yesterdayKey = dayKey(new Date(startOfDay(now).getTime() - 86_400_000));

  const groups = useMemo(() => {
    const filtered = greens.filter((g) => withinPeriod(g.startsAt, period, now));
    const byDay = new Map<string, GreenBilhete[]>();
    for (const g of filtered) {
      const key = dayKey(new Date(g.startsAt));
      const arr = byDay.get(key) ?? [];
      arr.push(g);
      byDay.set(key, arr);
    }
    // Most recent day first (rows already come newest-first from the API).
    return [...byDay.entries()].sort(
      (a, b) =>
        new Date(b[1][0].startsAt).getTime() -
        new Date(a[1][0].startsAt).getTime(),
    );
  }, [greens, period, now]);

  const total = greens.filter((g) => withinPeriod(g.startsAt, period, now)).length;

  return (
    <main className="greens">
      <div className="greens__inner">
        <header className="greens__head">
          <h1>Últimos Greens</h1>
          <p>Bilhetes que já bateram — nosso histórico de acertos.</p>
        </header>

        <div className="greens__filters" role="tablist" aria-label="Período">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={period === f.key}
              className="greens__filter"
              data-active={period === f.key}
              onClick={() => setPeriod(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="greens__empty">Carregando…</p>
        ) : total === 0 ? (
          <p className="greens__empty">Nenhum green neste período ainda.</p>
        ) : (
          groups.map(([key, rows]) => (
            <section key={key} className="greens__group">
              <h2 className="greens__day">
                {groupLabel(key, todayKey, yesterdayKey)}
                <span>{rows.length}</span>
              </h2>
              <div className="greens__list">
                {rows.map((g) => (
                  <GreenCard key={g.id} b={g} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}

function GreenCard({ b }: { b: GreenBilhete }) {
  return (
    <article className="gcard">
      <div className="gcard__meta">
        <span className="gcard__tier" data-tone={TIER_TONE[b.tierLabel] ?? 'ultra'}>
          {b.tierLabel}
        </span>
        {b.competition && <span className="gcard__comp">{b.competition}</span>}
        <span className="gcard__badge">
          <Check /> GREEN
        </span>
      </div>

      <div className="gcard__teams">
        <div className="gcard__team">
          <Crest name={b.homeTeam} logo={b.homeLogo} color={b.homeColor} />
          <span>{b.homeTeam}</span>
        </div>
        <span className="gcard__vs">VS</span>
        <div className="gcard__team">
          <Crest name={b.awayTeam} logo={b.awayLogo} color={b.awayColor} />
          <span>{b.awayTeam}</span>
        </div>
      </div>

      <div className="gcard__row">
        <span className="gcard__pick">{pickLabel(b)}</span>
        <span className="gcard__odd">
          <i>Odd</i> {b.odd.toFixed(2)}
        </span>
      </div>
    </article>
  );
}

function Crest({
  name,
  logo,
  color,
}: {
  name: string;
  logo: string | null;
  color: string | null;
}) {
  if (logo) {
    return (
      <span className="gcrest gcrest--img" aria-hidden="true">
        <img src={logo} alt="" loading="lazy" />
      </span>
    );
  }
  return (
    <span
      className="gcrest"
      style={{ ['--crest' as string]: color ?? fallbackColor(name) }}
      aria-hidden="true"
    >
      {shortName(name)}
    </span>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
      <path
        d="m5 12.5 4.2 4.2L19 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
