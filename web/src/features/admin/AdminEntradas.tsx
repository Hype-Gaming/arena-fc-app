import { useEffect, useState } from 'react';
import { adminApi } from './adminApi';

interface Row {
  id: string;
  market: string;
  selection: string;
  odd: number;
  status: 'pending' | 'green' | 'red';
}

export function AdminEntradas({ matchId }: { matchId: string }) {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    adminApi.listEntradas(matchId).then((r) => setRows(r as Row[]));
  }, [matchId]);

  async function mark(id: string, result: 'green' | 'red') {
    const updated = (await adminApi.setEntradaResult(id, result)) as Row;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: updated.status } : r)));
  }

  return (
    <ul>
      {rows.map((r) => (
        <li key={r.id}>
          <span>
            {r.market} — {r.selection}
          </span>
          <span> @ {r.odd}</span>
          <span>{r.status}</span>
          <button onClick={() => mark(r.id, 'green')}>Green</button>
          <button onClick={() => mark(r.id, 'red')}>Red</button>
        </li>
      ))}
    </ul>
  );
}
