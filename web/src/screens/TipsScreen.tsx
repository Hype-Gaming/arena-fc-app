// web/src/screens/TipsScreen.tsx
import { useEffect, useState } from 'react';
import type { ApiClient } from '../lib/apiClient';

export interface FeedEntrada {
  id: string;
  market: string;
  selection: string;
  odd: number;
  costInCredits: number;
  status: 'pending' | 'green' | 'red';
  justification: string | null;
  unlocked: boolean;
}

export interface FeedCategory {
  category: { id: string; name: string; slug: string };
  entradas: FeedEntrada[];
}

interface Props {
  api: Pick<ApiClient, 'get' | 'post'>;
  onBuyCredits: () => void;
}

export function TipsScreen({ api, onBuyCredits }: Props) {
  const [feed, setFeed] = useState<FeedCategory[]>([]);
  const [needCredits, setNeedCredits] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<FeedCategory[]>('/tips/feed')
      .then(setFeed)
      .catch(() => setError('Não foi possível carregar as entradas.'));
  }, [api]);

  async function unlock(entradaId: string) {
    setNeedCredits(false);
    setError(null);
    try {
      const updated = await api.post<FeedEntrada>(
        `/tips/entradas/${entradaId}/unlock`,
        {},
      );
      setFeed((prev) =>
        prev.map((c) => ({
          ...c,
          entradas: c.entradas.map((e) =>
            e.id === entradaId ? { ...e, ...updated, unlocked: true } : e,
          ),
        })),
      );
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
      {feed.map((group) => (
        <section key={group.category.id}>
          <h2>{group.category.name}</h2>
          {group.entradas.map((e) => (
            <article key={e.id} className="card">
              <p>
                {e.market} — {e.selection}
              </p>
              <span className="odd">{e.odd}</span>
              {e.unlocked && e.justification ? (
                <p data-testid={`justification-${e.id}`}>{e.justification}</p>
              ) : (
                <button className="cta-green" onClick={() => unlock(e.id)}>
                  Destravar ({e.costInCredits})
                </button>
              )}
            </article>
          ))}
        </section>
      ))}
    </main>
  );
}
