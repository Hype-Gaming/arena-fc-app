import { useEffect, useState } from 'react';
import { adminApi } from './adminApi';
import { AdminEntradas } from './AdminEntradas';
import { AdminBilhetes } from './AdminBilhetes';
import './admin.css';

export function AdminPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    adminApi.listMatches().then(setMatches);
    adminApi.listUsers().then(setUsers);
  }, []);

  return (
    <main className="admin">
      <div className="admin__inner">
        <h1>
          Backoffice <span>Premier FC</span>
        </h1>

        <AdminBilhetes />

        <section>
          <h2>Jogos (Tips)</h2>
          <ul>
            {matches.map((m) => (
              <li key={m.id}>
                <button onClick={() => setSelected(m.id)}>
                  {m.homeTeam} vs {m.awayTeam}
                </button>
              </li>
            ))}
          </ul>
          {selected && <AdminEntradas matchId={selected} />}
        </section>

        <section>
          <h2>Usuários &amp; saldos</h2>
          <ul>
            {users.map((u) => (
              <li key={u.id}>
                {u.email} — {u.balance}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
