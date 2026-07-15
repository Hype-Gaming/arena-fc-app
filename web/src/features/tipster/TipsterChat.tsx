// web/src/features/tipster/TipsterChat.tsx — chat tab of the IA Tipster screen
import { useEffect, useState } from 'react';
import { useGate } from '../../components/TelegramGate';
import {
  searchMatches,
  analyzeMatch,
  upcomingMatches,
  type TipsterMatch,
} from './tipsterApi';
import './TipsterScreen.css';

interface ChatLine {
  role: 'user' | 'assistant';
  content: string;
}

interface TipsterChatProps {
  onBuyCredits?: () => void;
  /** Called with the new credit balance after a paid analysis. */
  onBalance?: (balance: number) => void;
  /** Preset empty-state suggestions (used by previews/tests); skips fetching. */
  suggestions?: TipsterMatch[];
}

function formatKickoff(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
  const time = d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${date} às ${time}`;
}

export function TipsterChat({
  onBuyCredits,
  onBalance,
  suggestions,
}: TipsterChatProps = {}) {
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<TipsterMatch | null>(null);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [needCredits, setNeedCredits] = useState(false);
  const [busy, setBusy] = useState(false);
  const [upcoming, setUpcoming] = useState<TipsterMatch[]>(suggestions ?? []);
  const { requireUnlock } = useGate();

  useEffect(() => {
    if (suggestions) return;
    let alive = true;
    upcomingMatches()
      .then((m) => {
        if (alive) setUpcoming(m);
      })
      .catch(() => {
        /* suggestions are best-effort; hide on failure */
      });
    return () => {
      alive = false;
    };
  }, [suggestions]);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFound(null);
    if (!query.trim()) return;
    setBusy(true);
    try {
      const matches = await searchMatches(query.trim());
      if (matches.length === 0) {
        setError('Não achei esse jogo. Tente outro nome.');
      } else {
        setFound(matches[0]);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm() {
    if (!found) return;
    setError(null);
    setNeedCredits(false);
    setBusy(true);
    setLines((prev) => [
      ...prev,
      { role: 'user', content: `${found.homeTeam} x ${found.awayTeam}` },
    ]);
    try {
      const res = await analyzeMatch(found.id);
      setLines((prev) => [...prev, { role: 'assistant', content: res.message }]);
      onBalance?.(res.balanceAfter);
      setFound(null);
    } catch (err) {
      const status = (err as { status?: number }).status;
      const message = (err as Error).message;
      if (
        onBuyCredits &&
        (status === 402 || /insufficient credits|sem cr[eé]ditos/i.test(message))
      ) {
        setNeedCredits(true);
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  const empty = lines.length === 0 && !found;

  return (
    <div className="tst-chat">
      {empty ? (
        <div className="tst-empty">
          <span className="tst-empty__icon" aria-hidden="true">
            <SparklesBig />
          </span>
          <h2 className="tst-empty__title">Pergunte sobre qualquer jogo</h2>
          <p className="tst-empty__sub">
            Diga o nome dos times. Eu busco nos próximos 15 dias e analiso com
            dados reais.
          </p>

          {upcoming.length > 0 && (
            <div className="tst-suggest">
              <p className="tst-suggest__label">
                Próximos jogos nas ligas cobertas
              </p>
              <ul className="tst-suggest__list">
                {upcoming.map((m) => {
                  const when = formatKickoff(m.startsAt);
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        className="tst-suggest__item"
                        onClick={() => {
                          setError(null);
                          setFound(m);
                        }}
                      >
                        <span className="tst-suggest__teams">
                          {m.homeTeam} <i>x</i> {m.awayTeam}
                        </span>
                        <span className="tst-suggest__meta">
                          <span className="tst-suggest__tag">
                            <Trophy /> {m.competition}
                          </span>
                          {when && (
                            <span className="tst-suggest__tag">
                              <CalendarIcon /> {when}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="tst-log">
          {lines.map((l, i) => (
            <p key={i} className={`tst-line tst-line--${l.role}`}>
              {l.content}
            </p>
          ))}
        </div>
      )}

      {found && (
        <div className="tst-confirm">
          <p className="tst-confirm__match">
            {found.homeTeam} x {found.awayTeam}{' '}
            <span>({found.competition})</span>
          </p>
          <p className="tst-confirm__ask">Achei esse jogo. Confirma?</p>
          <button
            type="button"
            className="tst-confirm__btn"
            onClick={() => requireUnlock(onConfirm)}
            disabled={busy}
          >
            Confirmar
          </button>
        </div>
      )}

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

      <form onSubmit={onSearch} className="tst-composer">
        <input
          className="tst-composer__input"
          placeholder="Pergunte sobre um jogo"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="submit"
          className="tst-composer__send"
          disabled={busy}
          aria-label="Buscar"
        >
          <SendIcon />
        </button>
      </form>
    </div>
  );
}

/* ---- inline icons (lucide-style) ---- */
function SparklesBig() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4M22 5h-4" />
    </svg>
  );
}
function Trophy() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
      <path d="m21.854 2.147-10.94 10.939" />
    </svg>
  );
}
