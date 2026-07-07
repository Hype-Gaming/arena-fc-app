// web/src/admin/AdminBilhetes.tsx — backoffice section to create/manage bilhetes
import { useEffect, useState, type FormEvent } from 'react';
import {
  adminApi,
  type AdminBilhete,
  type BilheteCategoria,
  type EventPreview,
  type SportEvent,
  type SportMarket,
  type SportSelection,
  type Team,
} from './adminApi';

const CATEGORIAS: { key: BilheteCategoria; label: string }[] = [
  { key: 'safes', label: 'Odds Safes (Básico)' },
  { key: 'pro', label: 'Odds Pró (Premium)' },
  { key: 'ultra', label: 'Odds Ultra (Premium)' },
  { key: 'alavancagem', label: 'Alavancagem (Diamante)' },
  { key: 'multiplas', label: 'Múltiplas (Diamante)' },
  { key: 'secundario', label: 'Merc. Secundário (Diamante)' },
  { key: 'ligas', label: 'Ligas Americanas (Diamante)' },
];

const EMPTY = {
  categoria: 'safes' as BilheteCategoria,
  homeTeam: '',
  awayTeam: '',
  competition: '',
  mercado: '',
  selecao: '',
  linha: '',
  startsAt: '',
  odd: '',
  eventDeepLink: '',
  eventExternalId: '',
};

const MARKET_ORDER = ['1x2', 'over_under', 'btts', 'double_chance', 'dnb'];
const MARKET_LABELS: Record<string, string> = {
  '1x2': 'Resultado Final',
  over_under: 'Total de Gols',
  btts: 'Ambas Marcam',
  double_chance: 'Dupla Chance',
  dnb: 'Empate Anula',
};

function sortedMarkets(markets: SportMarket[] | null | undefined): SportMarket[] {
  return [...(markets ?? [])]
    .filter((m) => m.selections.length > 0)
    .sort((a, b) => {
      const ai = MARKET_ORDER.indexOf(a.key);
      const bi = MARKET_ORDER.indexOf(b.key);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
}

function lineValue(line: number | null): string {
  return line == null ? '' : String(line);
}

function marketTitle(market: SportMarket): string {
  return MARKET_LABELS[market.key] ?? market.name;
}

/** ISO instant → the local value a <input type="datetime-local"> expects. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Common API-Football league ids for the sync selector. */
const LEAGUES = [
  { id: 71, label: 'Brasileirão Série A' },
  { id: 72, label: 'Brasileirão Série B' },
  { id: 13, label: 'Libertadores' },
  { id: 39, label: 'Premier League' },
  { id: 140, label: 'La Liga' },
  { id: 135, label: 'Serie A (Itália)' },
  { id: 78, label: 'Bundesliga' },
  { id: 61, label: 'Ligue 1' },
  { id: 2, label: 'Champions League' },
  { id: 1, label: 'Copa do Mundo' },
];

/** Free API-Football plan only serves these seasons. */
const SEASONS = [2024, 2023, 2022];

export function AdminBilhetes() {
  const [items, setItems] = useState<AdminBilhete[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<SportEvent[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [previewRef, setPreviewRef] = useState('');
  const [preview, setPreview] = useState<EventPreview | null>(null);
  // Crests resolved on demand (typed names / seleções not in the catalog yet),
  // keyed by the lowercased team name → our cache URL.
  const [resolvedCrests, setResolvedCrests] = useState<Record<string, string>>({});
  const [bulkMarket, setBulkMarket] = useState('1x2');
  const [league, setLeague] = useState(LEAGUES[0].id);
  const [season, setSeason] = useState(SEASONS[0]);
  const [betslip, setBetslip] = useState('');
  const [betslipCat, setBetslipCat] = useState<BilheteCategoria>('safes');
  const [error, setError] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function refresh() {
    adminApi.listBilhetes().then(setItems).catch(() => setItems([]));
    adminApi.listTeams().then(setTeams).catch(() => setTeams([]));
    adminApi.listSportEvents().then(setEvents).catch(() => setEvents([]));
  }
  useEffect(refresh, []);

  const selectedEvent = events.find((ev) => ev.id === selectedEventId);
  const eventMarkets = sortedMarkets(selectedEvent?.markets);

  /** Catalog match by exact name → auto-fills the crest logo on create. */
  function teamByName(name: string): Team | undefined {
    const n = name.trim().toLowerCase();
    return teams.find((t) => t.name.toLowerCase() === n);
  }

  /**
   * Cached crest URL for a team name: catalog exact-name match first, then any
   * crest resolved on demand (a typed name or seleção fetched via the API).
   */
  function crestUrl(name: string): string | undefined {
    const t = teamByName(name);
    if (t) return `/api/team-logos/${t.externalId}.png`;
    return resolvedCrests[name.trim().toLowerCase()];
  }

  /**
   * On blur of a team-name field, fetch a crest for names the catalog doesn't
   * already cover (seleções, unsynced clubs) so the flag shows automatically.
   */
  async function onResolveCrest(name: string) {
    const n = name.trim();
    if (!n || teamByName(n) || resolvedCrests[n.toLowerCase()]) return;
    try {
      const { logo } = await adminApi.resolveTeamLogo(n);
      if (logo) setResolvedCrests((m) => ({ ...m, [n.toLowerCase()]: logo }));
    } catch {
      /* best-effort: keep the initials badge if the lookup fails */
    }
  }

  async function onSyncTeams() {
    setError(null);
    setSyncMsg(null);
    setBusy(true);
    try {
      const s = await adminApi.syncTeams({ league, season });
      setSyncMsg(`Times sincronizados: ${s.upserted} (liga ${s.league}, temporada ${s.season})`);
      refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onSyncEvents() {
    setError(null);
    setSyncMsg(null);
    setBusy(true);
    try {
      const s = await adminApi.syncSportEvents();
      setSyncMsg(`Jogos sincronizados: ${s.upserted} (${s.provider})`);
      refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onCreateFromEvents() {
    setError(null);
    setSyncMsg(null);
    setBusy(true);
    try {
      const r = await adminApi.createBilhetesFromEvents({
        categoria: form.categoria,
        mercado: bulkMarket,
      });
      setSyncMsg(
        `Bilhetes criados: ${r.created} (${r.withCrest} com escudo, de ${r.availableEvents} jogos)`,
      );
      refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onSyncEsportivaLeagues() {
    setError(null);
    setSyncMsg(null);
    setBusy(true);
    try {
      const s = await adminApi.syncEsportivaLeagues();
      setSyncMsg(
        `Ligas da Esportiva: ${s.synced}/${s.leaguesInFeed} sincronizadas, ${s.teamsUpserted} times` +
          (s.failed ? `, ${s.failed} falharam (temporada)` : '') +
          (s.skippedForCap ? `, ${s.skippedForCap} adiadas (cota)` : ''),
      );
      refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onSyncLiveLogos() {
    setError(null);
    setSyncMsg(null);
    setBusy(true);
    try {
      const s = await adminApi.syncLiveLogos();
      setSyncMsg(
        `Escudos ao vivo: +${s.added} novos, ${s.alreadyMatched}/${s.liveTeams} já tinham` +
          (s.notFound ? `, ${s.notFound} sem correspondência` : '') +
          (s.skippedForCap ? `, ${s.skippedForCap} adiados (cota)` : ''),
      );
      refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  /** Picking a synced fixture fills teams, kickoff, 1X2 home odd and deep link. */
  function onPickEvent(eventId: string) {
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return;
    setSelectedEventId(eventId);
    setPreview(null); // the synced pick takes over from a pasted preview
    const firstMarket = sortedMarkets(ev.markets)[0];
    const firstSelection = firstMarket?.selections[0];
    setForm((f) => ({
      ...f,
      homeTeam: ev.homeTeam,
      awayTeam: ev.awayTeam,
      competition: ev.competition ?? '',
      mercado: firstMarket?.key ?? '1x2',
      selecao: firstSelection?.label ?? ev.homeTeam,
      linha: lineValue(firstSelection?.line ?? null),
      startsAt: toLocalInput(ev.startsAt),
      odd:
        firstSelection?.odd != null
          ? String(Number(firstSelection.odd))
          : ev.oddHome != null
            ? String(Number(ev.oddHome))
            : f.odd,
      eventDeepLink: ev.deepLink,
      eventExternalId: ev.externalId,
    }));
  }

  function onPickSelection(market: SportMarket, selection: SportSelection) {
    setForm((f) => ({
      ...f,
      mercado: market.key,
      selecao: selection.label,
      linha: lineValue(selection.line),
      odd: String(Number(selection.odd)),
    }));
  }

  /** Paste an Esportiva match link → preview the card + its popular markets. */
  async function onPreviewLink() {
    setError(null);
    setBusy(true);
    try {
      const p = await adminApi.previewEvent(previewRef.trim());
      setPreview(p);
      setSelectedEventId(''); // the pasted event takes over the card
      // Remember any crests the API resolved so the form preview picks them up.
      setResolvedCrests((m) => ({
        ...m,
        ...(p.homeLogo ? { [p.homeTeam.trim().toLowerCase()]: p.homeLogo } : {}),
        ...(p.awayLogo ? { [p.awayTeam.trim().toLowerCase()]: p.awayLogo } : {}),
      }));
      const firstMarket = sortedMarkets(p.markets)[0];
      const firstSelection = firstMarket?.selections[0];
      setForm((f) => ({
        ...f,
        homeTeam: p.homeTeam,
        awayTeam: p.awayTeam,
        competition: p.competition ?? '',
        mercado: firstMarket?.key ?? '',
        selecao: firstSelection?.label ?? p.homeTeam,
        linha: lineValue(firstSelection?.line ?? null),
        startsAt: toLocalInput(p.startsAt),
        odd: firstSelection?.odd != null ? String(Number(firstSelection.odd)) : f.odd,
        eventDeepLink: p.deepLink,
        eventExternalId: p.externalId,
      }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onImportBetslip() {
    setError(null);
    setBusy(true);
    try {
      const r = await adminApi.importBetslip({ json: betslip, categoria: betslipCat });
      setSyncMsg(`Bilhetes importados do betslip: ${r.imported}`);
      setBetslip('');
      refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await adminApi.createBilhete({
        categoria: form.categoria,
        mercado: form.mercado || undefined,
        selecao: form.selecao || undefined,
        linha: form.linha === '' ? undefined : Number(form.linha),
        homeTeam: form.homeTeam.trim(),
        awayTeam: form.awayTeam.trim(),
        homeLogo: crestUrl(form.homeTeam),
        awayLogo: crestUrl(form.awayTeam),
        competition: form.competition.trim() || undefined,
        startsAt: new Date(form.startsAt).toISOString(),
        odd: Number(form.odd),
        eventDeepLink: form.eventDeepLink || undefined,
        eventExternalId: form.eventExternalId || undefined,
      });
      setForm(EMPTY);
      setSelectedEventId('');
      setPreview(null);
      setPreviewRef('');
      refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onResult(id: string, resultado: 'green' | 'red' | 'pending') {
    await adminApi.setBilheteResult(id, resultado);
    refresh();
  }

  async function onTogglePublish(b: AdminBilhete) {
    await adminApi.setBilhetePublished(b.id, !b.publishedAt);
    refresh();
  }

  async function onDelete(id: string) {
    await adminApi.deleteBilhete(id);
    refresh();
  }

  /** The clickable market/selection grid, shared by the synced pick + preview. */
  function renderMarkets(markets: SportMarket[]) {
    return (
      <div className="ab-markets">
        {markets.map((market) => (
          <section className="ab-market" key={`${market.typeId}-${market.key}`}>
            <h3>{marketTitle(market)}</h3>
            <div className="ab-market__grid">
              {market.selections.map((selection) => {
                const active =
                  form.mercado === market.key &&
                  form.selecao === selection.label &&
                  form.linha === lineValue(selection.line);
                return (
                  <button
                    type="button"
                    key={`${selection.label}-${selection.line ?? 'noline'}`}
                    className="ab-selection"
                    data-active={active}
                    onClick={() => onPickSelection(market, selection)}
                  >
                    <span>{selection.label}</span>
                    <b>{Number(selection.odd).toFixed(2)}</b>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <section>
      <h2>Bilhetes</h2>

      <p className="ab-sync">
        <label>
          Liga{' '}
          <select
            value={league}
            onChange={(e) => setLeague(Number(e.target.value))}
            aria-label="Liga"
          >
            {LEAGUES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Temporada{' '}
          <select
            value={season}
            onChange={(e) => setSeason(Number(e.target.value))}
            aria-label="Temporada"
          >
            {SEASONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={onSyncTeams} disabled={busy}>
          Sincronizar times
        </button>
        <button type="button" onClick={onSyncEsportivaLeagues} disabled={busy}>
          Puxar times das ligas (Esportiva)
        </button>
        <small>{teams.length} times no catálogo</small>
        {syncMsg && <em>{syncMsg}</em>}
      </p>

      <p className="ab-sync">
        <button type="button" onClick={onSyncEvents} disabled={busy}>
          Sincronizar jogos (Esportiva)
        </button>
        <small>{events.length} jogos disponíveis</small>
        <label>
          Mercado{' '}
          <select
            value={bulkMarket}
            onChange={(e) => setBulkMarket(e.target.value)}
            aria-label="Mercado para criar bilhetes dos jogos"
          >
            {MARKET_ORDER.map((key) => (
              <option key={key} value={key}>
                {MARKET_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={onCreateFromEvents} disabled={busy}>
          Criar bilhetes dos jogos
        </button>
        <small>vira cada jogo em bilhete, com escudo do catálogo</small>
      </p>

      <p className="ab-sync">
        <button type="button" onClick={onSyncLiveLogos} disabled={busy}>
          Sincronizar escudos (ao vivo)
        </button>
        <small>casa os times ao vivo com o catálogo e baixa os logos</small>
      </p>

      <form onSubmit={onCreate} className="admin-bilhetes__form">
        <div className="ab-paste">
          <label>
            Colar link da Esportiva{' '}
            <input
              value={previewRef}
              onChange={(e) => setPreviewRef(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onPreviewLink();
                }
              }}
              placeholder="https://esportiva.bet.br/…/le-16993776"
              aria-label="Link do jogo na Esportiva"
            />
          </label>
          <button
            type="button"
            className="ab-primary"
            onClick={onPreviewLink}
            disabled={busy || previewRef.trim() === ''}
          >
            Ver jogo
          </button>
          <small>cola o jogo montado na Esportiva e veja o card + mercados</small>
        </div>
        {preview && (
          <div className="ab-event-card">
            <div className="ab-event-card__head">
              <div>
                <b className="ab-event-card__title">
                  {preview.homeLogo && <img className="ab-crest" src={preview.homeLogo} alt="" />}
                  {preview.homeTeam} x {preview.awayTeam}
                  {preview.awayLogo && <img className="ab-crest" src={preview.awayLogo} alt="" />}
                </b>
                <span>{preview.competition ?? 'Futebol'}</span>
              </div>
              <a href={preview.deepLink} target="_blank" rel="noreferrer">
                Abrir Esportiva
              </a>
            </div>
            {sortedMarkets(preview.markets).length === 0 ? (
              <p className="ab-market-empty">Sem mercados populares para este jogo.</p>
            ) : (
              renderMarkets(sortedMarkets(preview.markets))
            )}
          </div>
        )}
        {events.length > 0 && (
          <label>
            Puxar jogo{' '}
            <select
              value={selectedEventId}
              onChange={(e) => onPickEvent(e.target.value)}
              aria-label="Puxar jogo da Esportiva"
            >
              <option value="" disabled>
                Escolha um jogo…
              </option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.homeTeam} x {ev.awayTeam}
                  {ev.oddHome != null ? ` — ${Number(ev.oddHome).toFixed(2)}` : ''}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Categoria{' '}
          <select
            value={form.categoria}
            onChange={(e) =>
              setForm({ ...form, categoria: e.target.value as BilheteCategoria })
            }
          >
            {CATEGORIAS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        {selectedEvent && (
          <div className="ab-event-card">
            <div className="ab-event-card__head">
              <div>
                <b>
                  {selectedEvent.homeTeam} x {selectedEvent.awayTeam}
                </b>
                <span>{selectedEvent.competition ?? 'Futebol'}</span>
              </div>
              <a href={selectedEvent.deepLink} target="_blank" rel="noreferrer">
                Abrir Esportiva
              </a>
            </div>
            {eventMarkets.length === 0 ? (
              <p className="ab-market-empty">
                Este jogo ainda nao trouxe mercados estruturados; use a odd manual.
              </p>
            ) : (
              renderMarkets(eventMarkets)
            )}
          </div>
        )}
        <label>
          Casa{' '}
          <span className="ab-team">
            <input
              list="admin-teams"
              value={form.homeTeam}
              onChange={(e) => setForm({ ...form, homeTeam: e.target.value })}
              onBlur={(e) => onResolveCrest(e.target.value)}
              placeholder="Espanha"
              required
            />
            {crestUrl(form.homeTeam) && (
              <img
                className="ab-crest"
                src={crestUrl(form.homeTeam)}
                alt=""
                title="Escudo do catálogo será anexado"
              />
            )}
          </span>
        </label>
        <label>
          Visitante{' '}
          <span className="ab-team">
            <input
              list="admin-teams"
              value={form.awayTeam}
              onChange={(e) => setForm({ ...form, awayTeam: e.target.value })}
              onBlur={(e) => onResolveCrest(e.target.value)}
              placeholder="Áustria"
              required
            />
            {crestUrl(form.awayTeam) && (
              <img
                className="ab-crest"
                src={crestUrl(form.awayTeam)}
                alt=""
                title="Escudo do catálogo será anexado"
              />
            )}
          </span>
        </label>
        <datalist id="admin-teams">
          {teams.map((tm) => (
            <option key={tm.id} value={tm.name} />
          ))}
        </datalist>
        <label>
          Competição{' '}
          <input
            value={form.competition}
            onChange={(e) => setForm({ ...form, competition: e.target.value })}
            placeholder="Copa do Mundo"
          />
        </label>
        <label>
          Início{' '}
          <input
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
            required
          />
        </label>
        <label>
          Mercado{' '}
          <input
            value={form.mercado}
            onChange={(e) => setForm({ ...form, mercado: e.target.value })}
            placeholder="1x2"
          />
        </label>
        <label>
          Selecao{' '}
          <input
            value={form.selecao}
            onChange={(e) => setForm({ ...form, selecao: e.target.value })}
            placeholder="Bahia"
          />
        </label>
        <label>
          Linha{' '}
          <input
            type="number"
            step="0.01"
            value={form.linha}
            onChange={(e) => setForm({ ...form, linha: e.target.value })}
            placeholder="2.5"
          />
        </label>
        <label>
          Odd selecionada{' '}
          <input
            type="number"
            step="0.01"
            min="1.01"
            value={form.odd}
            onChange={(e) => setForm({ ...form, odd: e.target.value })}
            placeholder="1.53"
            required
          />
        </label>
        <button type="submit" disabled={busy}>
          Criar bilhete
        </button>
        {error && <p role="alert">{error}</p>}
      </form>

      <div className="ab-betslip">
        <h3>Importar do betslip da Esportiva</h3>
        <p className="ab-hint">
          Monte a aposta na Esportiva, cole aqui o JSON de{' '}
          <code>WSDK_esportiva_betSelections</code> (localStorage) e cada seleção
          vira um bilhete.
        </p>
        <textarea
          value={betslip}
          onChange={(e) => setBetslip(e.target.value)}
          placeholder='[{"eventName":"Botafogo vs. Santos","odd":1.91,...}]'
          rows={4}
        />
        <div className="ab-betslip__actions">
          <select
            value={betslipCat}
            onChange={(e) => setBetslipCat(e.target.value as BilheteCategoria)}
            aria-label="Categoria do import"
          >
            {CATEGORIAS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="ab-primary"
            onClick={onImportBetslip}
            disabled={busy || betslip.trim() === ''}
          >
            Importar betslip
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="ab-empty">Nenhum bilhete criado ainda.</p>
      ) : (
        <ul className="admin-bilhetes__list">
          {items.map((b) => (
            <li key={b.id} className="ab-item">
              <div className="ab-item__main">
                <span className="ab-item__match">
                  {b.homeTeam} x {b.awayTeam}
                </span>
                <span className="ab-item__meta">
                  {b.competition ? `${b.competition} · ` : ''}
                  {new Date(b.startsAt).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              {(b.mercado || b.selecao) && (
                <span className="ab-chip ab-chip--pick">
                  {b.mercado ?? 'mercado'} - {b.selecao ?? 'selecao'}
                  {b.linha != null ? ` (${Number(b.linha).toFixed(2)})` : ''}
                </span>
              )}
              <span className="ab-chip">{b.categoria}</span>
              <span className="ab-odd">{Number(b.odd).toFixed(2)}</span>
              <span className="ab-pill" data-res={b.resultado}>
                {b.resultado === 'green'
                  ? 'Verde'
                  : b.resultado === 'red'
                    ? 'Vermelho'
                    : 'Pendente'}
              </span>
              <span className="ab-pill" data-pub={!!b.publishedAt}>
                {b.publishedAt ? 'Publicado' : 'Rascunho'}
              </span>
              <span className="ab-actions">
                <button onClick={() => onResult(b.id, 'green')}>Green</button>
                <button onClick={() => onResult(b.id, 'red')}>Red</button>
                <button onClick={() => onTogglePublish(b)}>
                  {b.publishedAt ? 'Despublicar' : 'Publicar'}
                </button>
                <button onClick={() => onDelete(b.id)}>Excluir</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
