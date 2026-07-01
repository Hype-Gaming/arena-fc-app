// web/src/screens/TipsScreen.tsx
import { useEffect, useState } from 'react';
import type { ApiClient } from '../lib/apiClient';

export interface FeedEntrada {
  id: string;
  market: string;
  selection: string;
  odd: number;
  costInCredits: number;
  status: string;
  publishedAt: string | null;
  locked: boolean;
  justification: string | null;
}

export interface FeedMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  startsAt: string;
  status: string;
  entradas: FeedEntrada[];
}

export interface FeedCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  matches: FeedMatch[];
}

interface FeedResponse {
  categories: FeedCategory[];
}

interface UnlockResponse {
  alreadyUnlocked: boolean;
  justification: string;
  entrada: { id: string };
}

interface Props {
  api: Pick<ApiClient, 'get' | 'post'>;
  onBuyCredits: () => void;
}

export function TipsScreen({ api, onBuyCredits }: Props) {
  const [categories, setCategories] = useState<FeedCategory[]>([]);
  const [needCredits, setNeedCredits] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<FeedResponse>('/tips/feed')
      .then((res) => setCategories(res.categories))
      .catch(() => setError('Não foi possível carregar as entradas.'));
  }, [api]);

  function reveal(entradaId: string, justification: string) {
    setCategories((prev) =>
      prev.map((c) => ({
        ...c,
        matches: c.matches.map((m) => ({
          ...m,
          entradas: m.entradas.map((e) =>
            e.id === entradaId ? { ...e, locked: false, justification } : e,
          ),
        })),
      })),
    );
  }

  async function unlock(entradaId: string) {
    setNeedCredits(false);
    setError(null);
    try {
      const res = await api.post<UnlockResponse>(
        `/tips/entradas/${entradaId}/unlock`,
        {},
      );
      reveal(entradaId, res.justification);
    } catch (err) {
      if ((err as { status?: number }).status === 402) {
        setNeedCredits(true);
      } else {
        setError('Não foi possível destravar. Tente novamente.');
      }
    }
  }

  return (
    <main className="tips">
      {needCredits && (
        <div role="alert" className="banner">
          <span>Sem créditos.</span>
          <button className="cta-green" onClick={onBuyCredits}>
            Comprar créditos
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="tips__error">
          {error}
        </p>
      )}
      {categories.map((cat) => (
        <section key={cat.id} className="tips__category">
          <h2>{cat.icon ? `${cat.icon} ${cat.name}` : cat.name}</h2>
          {cat.matches.map((m) => (
            <div key={m.id} className="match">
              <h3>
                {m.homeTeam} x {m.awayTeam}
              </h3>
              <span className="competition">{m.competition}</span>
              {m.entradas.map((e) => (
                <article key={e.id} className="card">
                  <p>
                    {e.market} — {e.selection}
                  </p>
                  <span className="odd">{e.odd}</span>
                  {!e.locked && e.justification ? (
                    <p data-testid={`justification-${e.id}`}>
                      {e.justification}
                    </p>
                  ) : (
                    <button
                      className="cta-green"
                      onClick={() => unlock(e.id)}
                    >
                      Destravar ({e.costInCredits})
                    </button>
                  )}
                </article>
              ))}
            </div>
          ))}
        </section>
      ))}
    </main>
  );
}
