// web/src/screens/PerfilScreen.tsx
import { useEffect, useState } from 'react';
import type { ApiClient } from '../lib/apiClient';

interface MeProfile {
  email: string;
  planKey: string;
  planName: string;
  creditBalance: number;
}

interface AchievementStatus {
  key: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number;
  threshold: number;
}

interface GamificationProfile {
  xp: number;
  level: number;
  currentLevelFloor: number;
  nextLevelXp: number | null;
  achievements: AchievementStatus[];
}

interface Props {
  api: Pick<ApiClient, 'get'>;
  onLogout: () => void;
}

// LastLink-first MVP: the "buy credits" CTA sends the user to the hosted
// checkout link for the credit product. Payment fires the webhook that grants
// credits — there is no backend-generated checkout URL for the MVP. Configure
// the real product link via VITE_CHECKOUT_URL.
const CHECKOUT_URL =
  (import.meta.env.VITE_CHECKOUT_URL as string | undefined) ??
  'https://lastlink.com';

export function PerfilScreen({ api, onLogout }: Props) {
  const [me, setMe] = useState<MeProfile | null>(null);
  const [gam, setGam] = useState<GamificationProfile | null>(null);

  useEffect(() => {
    api.get<MeProfile>('/me').then(setMe);
    api.get<GamificationProfile>('/gamification/me').then(setGam);
  }, [api]);

  function buyCredits() {
    window.open(CHECKOUT_URL, '_blank');
  }

  if (!me || !gam) return <main className="perfil">Carregando…</main>;

  return (
    <main className="perfil">
      <h1>{me.email}</h1>

      <section className="card">
        <p className="plan">{me.planName}</p>
        <p>{me.creditBalance} créditos</p>
      </section>

      <section className="card">
        <p>Nível {gam.level}</p>
        <p>{gam.xp} XP</p>
      </section>

      <section className="card">
        <h2>Conquistas</h2>
        <ul className="achievements">
          {gam.achievements.map((a) => (
            <li key={a.key} data-unlocked={a.unlocked}>
              <span className="achievement__name">{a.name}</span>
              <span className="achievement__desc">{a.description}</span>
            </li>
          ))}
        </ul>
      </section>

      <button className="cta-green" onClick={buyCredits}>
        Comprar créditos
      </button>
      <button className="cta-ghost" onClick={onLogout}>
        Sair
      </button>
    </main>
  );
}
