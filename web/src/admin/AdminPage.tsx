import { useEffect, useState } from 'react';
import { adminApi } from './adminApi';
import { AdminEntradas } from './AdminEntradas';
import { AdminBilhetes } from './AdminBilhetes';
import './admin.css';

type TabKey = 'bilhetes' | 'criar' | 'jogos' | 'usuarios';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'bilhetes', label: 'Bilhetes' },
  { key: 'criar', label: 'Criar bilhete' },
  { key: 'jogos', label: 'Jogos (Tips)' },
  { key: 'usuarios', label: 'Usuários' },
];

interface AdminUser {
  id: string;
  email: string;
  role?: string;
  level?: number;
  xp?: number;
  balance?: number;
}

export function AdminPage() {
  const [tab, setTab] = useState<TabKey>('bilhetes');
  const [matches, setMatches] = useState<any[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [adminSession, setAdminSession] = useState<'checking' | 'ready' | 'denied'>(
    'checking',
  );

  useEffect(() => {
    let alive = true;
    adminApi
      .ensureAdminSession()
      .then(() => {
        if (alive) setAdminSession('ready');
      })
      .catch((err: Error) => {
        if (!alive) return;
        setAdminSession('denied');
        setLoadError(
          /403/.test(err.message)
            ? 'Sua conta não tem permissão de admin. Adicione seu e-mail em ADMIN_EMAILS e entre novamente.'
            : 'Não foi possível abrir uma sessão admin. Entre novamente e tente de novo.',
        );
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (adminSession !== 'ready') return;
    adminApi.listMatches().then(setMatches).catch(() => setMatches([]));
    adminApi
      .listUsers()
      .then(setUsers)
      .catch((err: Error) => {
        setUsers([]);
        if (/403/.test(err.message)) {
          setLoadError(
            'Sua conta não tem permissão de admin. Adicione seu e-mail em ADMIN_EMAILS e entre novamente.',
          );
        }
      });
  }, [adminSession]);

  return (
    <main className="admin">
      <div className="admin__inner">
        <h1>
          Backoffice <span>Arena FC</span>
        </h1>

        {loadError && (
          <p className="admin-alert" role="alert">
            {loadError}
          </p>
        )}

        {adminSession === 'checking' && (
          <p className="admin-alert" role="status">
            Abrindo sessão admin...
          </p>
        )}

        {adminSession === 'ready' && (
          <>
            <nav className="admin-tabs" aria-label="Seções do backoffice">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className="admin-tab"
                  data-active={tab === t.key}
                  aria-pressed={tab === t.key}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                  {t.key === 'usuarios' && users.length > 0 && (
                    <span className="admin-tab__count">{users.length}</span>
                  )}
                </button>
              ))}
            </nav>

            {tab === 'bilhetes' && <AdminBilhetes section="manage" />}
            {tab === 'criar' && <AdminBilhetes section="create" />}

            {tab === 'jogos' && (
              <section>
                <h2>Jogos (Tips)</h2>
                {matches.length === 0 ? (
                  <p className="ab-empty">Nenhum jogo cadastrado.</p>
                ) : (
                  <ul className="admin-list">
                    {matches.map((m) => (
                      <li key={m.id}>
                        <button
                          className="admin-list__pick"
                          data-active={selected === m.id}
                          onClick={() => setSelected(selected === m.id ? null : m.id)}
                        >
                          {m.homeTeam} vs {m.awayTeam}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {selected && <AdminEntradas matchId={selected} />}
              </section>
            )}

            {tab === 'usuarios' && (
              <section>
                <h2>Usuários &amp; saldos</h2>
                {users.length === 0 ? (
                  <p className="ab-empty">
                    {loadError ? 'Sem acesso de admin - nada a exibir.' : 'Nenhum usuário ainda.'}
                  </p>
                ) : (
                  <div className="admin-users">
                    <div className="admin-users__row admin-users__row--head" role="row">
                      <span>E-mail</span>
                      <span>Papel</span>
                      <span>Nível</span>
                      <span>Saldo</span>
                    </div>
                    {users.map((u) => (
                      <div className="admin-users__row" role="row" key={u.id}>
                        <span className="admin-users__email">{u.email}</span>
                        <span>
                          <span className="admin-role" data-admin={u.role === 'admin'}>
                            {u.role ?? 'user'}
                          </span>
                        </span>
                        <span>{u.level ?? 1}</span>
                        <span className="admin-users__balance">{u.balance ?? 0}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
