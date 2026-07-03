// web/src/features/tipster/TipsterLive.tsx — "Ao Vivo" tab: in-play matches + AI
import { useEffect, useState } from 'react';
import { liveMatches, analyzeLive, type LiveMatch } from './tipsterApi';
import './TipsterScreen.css';

interface Props {
  onBuyCredits?: () => void;
  onBalance?: (balance: number) => void;
  /** Preset matches (previews/tests); skips the fetch. */
  matches?: LiveMatch[];
}

interface Result {
  match: LiveMatch;
  message: string;
}

export function TipsterLive({ onBuyCredits, onBalance, matches }: Props = {}) {
  const [list, setList] = useState<LiveMatch[]>(matches ?? []);
  const [loading, setLoading] = useState(!matches);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [needCredits, setNeedCredits] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setList(await liveMatches());
    } catch {
      setError('Não consegui carregar os jogos ao vivo agora.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (matches) return;
    refresh();
  }, [matches]);

  async function onAnalyze(m: LiveMatch) {
    setBusyId(m.externalId);
    setError(null);
    setNeedCredits(false);
    try {
      const res = await analyzeLive(m.externalId);
      setResult({ match: m, message: res.message });
      onBalance?.(res.balanceAfter);
    } catch (err) {
      const status = (err as { status?: number }).status;
      const message = (err as Error).message;
      if (onBuyCredits && (status === 402 || /cr[eé]dito/i.test(message))) {
        setNeedCredits(true);
      } else {
        setError(message);
      }
    } finally {
      setBusyId(null);
    }
  }

  if (result) {
    const m = result.match;
    return (
      <div className="tst-live">
        <div className="tst-live__result">
          <div className="tst-live__rhead">
            <span className="tst-live__badge">
              <LiveDot /> AO VIVO
              {m.minute && <i> · {m.minute}</i>}
            </span>
            <span className="tst-live__rteams">
              <Crest name={m.homeTeam} logo={m.homeLogo} /> {m.homeTeam}{' '}
              <b>
                {m.homeScore}–{m.awayScore}
              </b>{' '}
              {m.awayTeam} <Crest name={m.awayTeam} logo={m.awayLogo} />
            </span>
          </div>
          <p className="tst-line tst-line--assistant tst-live__analysis">
            {result.message}
          </p>
          {m.deepLink && (
            <a
              className="tst-live__esportiva"
              href={m.deepLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir na Esportiva Bet
            </a>
          )}
          <button
            type="button"
            className="tst-live__back"
            onClick={() => setResult(null)}
          >
            ← Ver outros jogos ao vivo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tst-live">
      <div className="tst-live__bar">
        <span className="tst-live__count">
          {loading ? 'Buscando…' : `${list.length} jogos ao vivo`}
        </span>
        <button
          type="button"
          className="tst-live__refresh"
          onClick={refresh}
          disabled={loading}
          aria-label="Atualizar"
          title="Atualizar"
        >
          <RefreshIcon />
        </button>
      </div>

      {needCredits && onBuyCredits && (
        <div role="alert" className="tst-banner">
          <span>Sem créditos.</span>
          <button type="button" className="tst-banner__cta" onClick={onBuyCredits}>
            Comprar créditos
          </button>
        </div>
      )}
      {error && (
        <p className="tst-error" role="alert">
          {error}
        </p>
      )}

      {!loading && list.length === 0 ? (
        <div className="tst-placeholder">
          <RadioIcon />
          <p>Nenhuma partida ao vivo agora.</p>
          <span>Volte durante os jogos para uma análise em tempo real.</span>
        </div>
      ) : (
        <ul className="tst-live__list">
          {list.map((m) => (
            <li key={m.externalId}>
              <button
                type="button"
                className="tst-live__card"
                onClick={() => onAnalyze(m)}
                disabled={busyId === m.externalId}
                aria-label={`Analisar ${m.homeTeam} x ${m.awayTeam} ao vivo`}
              >
                <div className="tst-live__top">
                  <span className="tst-live__comp">
                    {m.competition ?? 'Ao vivo'}
                  </span>
                  <span className="tst-live__badge">
                    <LiveDot /> AO VIVO
                    <i> · {m.minute || m.statusText}</i>
                  </span>
                </div>

                <div className="tst-live__row">
                  <div className="tst-live__side">
                    <Crest name={m.homeTeam} logo={m.homeLogo} />
                    <span className="tst-live__name">{m.homeTeam}</span>
                  </div>
                  <span className="tst-live__score">
                    {m.homeScore} <i>–</i> {m.awayScore}
                  </span>
                  <div className="tst-live__side tst-live__side--away">
                    <span className="tst-live__name">{m.awayTeam}</span>
                    <Crest name={m.awayTeam} logo={m.awayLogo} />
                  </div>
                </div>

                <span className="tst-live__hint">
                  {busyId === m.externalId ? 'Analisando…' : 'Toque para análise IA'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---- crest: licensed logo when present, else a coloured initials badge ---- */
const CREST_COLORS = [
  '#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#d35400',
  '#16a085', '#2c3e50', '#c0932b', '#0b6f37', '#a93226',
];
function crestCode(name: string): string {
  const clean = name.replace(/[^\p{L}\p{N}]/gu, '');
  return clean.slice(0, 3).toUpperCase() || '?';
}
function crestColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return CREST_COLORS[h % CREST_COLORS.length];
}
function Crest({ name, logo }: { name: string; logo?: string | null }) {
  const [broken, setBroken] = useState(false);
  if (logo && !broken) {
    return (
      <span className="tst-crest tst-crest--img" aria-hidden="true">
        <img src={logo} alt="" loading="lazy" onError={() => setBroken(true)} />
      </span>
    );
  }
  return (
    <span
      className="tst-crest"
      style={{ ['--c' as string]: crestColor(name) }}
      aria-hidden="true"
    >
      {crestCode(name)}
    </span>
  );
}

/* ---- icons ---- */
function LiveDot() {
  return <span className="tst-live__dot" aria-hidden="true" />;
}
function RefreshIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
    </svg>
  );
}
function RadioIcon() {
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
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5M19.1 4.9c3.9 3.9 3.9 10.3 0 14.2" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
