import { useState } from 'react';
import { searchMatches, analyzeMatch, type TipsterMatch } from './tipsterApi';

interface ChatLine {
  role: 'user' | 'assistant';
  content: string;
}

export function TipsterChat() {
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<TipsterMatch | null>(null);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    setBusy(true);
    setLines((prev) => [
      ...prev,
      { role: 'user', content: `${found.homeTeam} x ${found.awayTeam}` },
    ]);
    try {
      const res = await analyzeMatch(found.id);
      setLines((prev) => [...prev, { role: 'assistant', content: res.message }]);
      setFound(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tipster-chat">
      <div className="tipster-chat__log">
        {lines.map((l, i) => (
          <p key={i} className={`tipster-chat__line tipster-chat__line--${l.role}`}>
            {l.content}
          </p>
        ))}
      </div>

      {found && (
        <div className="tipster-chat__confirm">
          <p>
            {found.homeTeam} x {found.awayTeam} ({found.competition})
          </p>
          <p>Achei esse jogo. Confirma?</p>
          <button type="button" onClick={onConfirm} disabled={busy}>
            Confirmar
          </button>
        </div>
      )}

      {error && <p className="tipster-chat__error">{error}</p>}

      <form onSubmit={onSearch} className="tipster-chat__form">
        <input
          placeholder="Digite um jogo (ex: São Paulo x Palmeiras)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" disabled={busy}>
          Buscar
        </button>
      </form>
    </div>
  );
}
