// web/src/admin/AdminBilhetes.tsx — backoffice section to create/manage bilhetes
import { useEffect, useState, type FormEvent } from 'react';
import {
  adminApi,
  type AdminBilhete,
  type BilheteCategoria,
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
  startsAt: '',
  odd: '',
};

export function AdminBilhetes() {
  const [items, setItems] = useState<AdminBilhete[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function refresh() {
    adminApi.listBilhetes().then(setItems).catch(() => setItems([]));
  }
  useEffect(refresh, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await adminApi.createBilhete({
        categoria: form.categoria,
        homeTeam: form.homeTeam.trim(),
        awayTeam: form.awayTeam.trim(),
        competition: form.competition.trim() || undefined,
        startsAt: new Date(form.startsAt).toISOString(),
        odd: Number(form.odd),
      });
      setForm(EMPTY);
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

  return (
    <section>
      <h2>Bilhetes</h2>

      <form onSubmit={onCreate} className="admin-bilhetes__form">
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
        <label>
          Casa{' '}
          <input
            value={form.homeTeam}
            onChange={(e) => setForm({ ...form, homeTeam: e.target.value })}
            placeholder="Espanha"
            required
          />
        </label>
        <label>
          Visitante{' '}
          <input
            value={form.awayTeam}
            onChange={(e) => setForm({ ...form, awayTeam: e.target.value })}
            placeholder="Áustria"
            required
          />
        </label>
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
          Odd{' '}
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

      <ul className="admin-bilhetes__list">
        {items.map((b) => (
          <li key={b.id}>
            <b>
              {b.homeTeam} x {b.awayTeam}
            </b>{' '}
            — {b.categoria} — odd {Number(b.odd).toFixed(2)} —{' '}
            {new Date(b.startsAt).toLocaleString('pt-BR')} — {b.resultado}
            {b.publishedAt ? ' — publicado' : ' — rascunho'}
            <span className="admin-bilhetes__actions">
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
    </section>
  );
}
