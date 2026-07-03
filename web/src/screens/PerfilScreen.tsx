// web/src/screens/PerfilScreen.tsx
import { useEffect, useState } from 'react';
import type { ApiClient } from '../lib/apiClient';
import { CHECKOUT_URL } from '../lib/checkout';
import './PerfilScreen.css';

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
  /** Opens the plan comparison. Falls back to the external checkout when absent. */
  onUpgrade?: () => void;
}

const env = import.meta.env as Record<string, string | undefined>;
const SUPPORT_URL = env.VITE_SUPPORT_URL ?? 'https://wa.me/5500000000000';
const FEEDBACK_URL = env.VITE_FEEDBACK_URL ?? 'mailto:contato@premierfc.app';

const LEVEL_NAMES = [
  'Novato',
  'Amador',
  'Casual',
  'Regular',
  'Experiente',
  'Veterano',
  'Profissional',
  'Mestre',
  'Lenda',
  'Elite',
];
function levelName(level: number): string {
  return LEVEL_NAMES[level - 1] ?? 'Elite';
}

const ACH_SLOTS = 7; // icons shown before the "+N" overflow chip

export function PerfilScreen({ api, onLogout, onUpgrade }: Props) {
  const [me, setMe] = useState<MeProfile | null>(null);
  const [gam, setGam] = useState<GamificationProfile | null>(null);

  useEffect(() => {
    api.get<MeProfile>('/me').then(setMe);
    api.get<GamificationProfile>('/gamification/me').then(setGam);
  }, [api]);

  if (!me || !gam) {
    return (
      <main className="pf-perfil">
        <p className="pf-perfil__loading">Carregando…</p>
      </main>
    );
  }

  const isPremium = me.planKey === 'premium';
  const next = gam.nextLevelXp ?? gam.xp;
  const span = Math.max(1, next - gam.currentLevelFloor);
  const pct = Math.min(
    100,
    Math.max(0, ((gam.xp - gam.currentLevelFloor) / span) * 100),
  );

  const unlockedCount = gam.achievements.filter((a) => a.unlocked).length;
  const shown = gam.achievements.slice(0, ACH_SLOTS);
  const overflow = gam.achievements.length - shown.length;

  return (
    <main className="pf-perfil">
      <div className="pf-perfil__inner">
        {/* header */}
        <section className="ppf-card ppf-user">
          <div className="ppf-avatar">
            <Ball />
          </div>
          <div className="ppf-user__main">
            <div className="ppf-email">{me.email}</div>
            <div className="ppf-badges">
              <span
                className={
                  isPremium ? 'ppf-badge ppf-badge--plan' : 'ppf-badge ppf-badge--plan is-free'
                }
              >
                <Star /> Plano {me.planName}
              </span>
              <span className="ppf-badge">
                <Star /> Nível {gam.level} — {levelName(gam.level)}
              </span>
            </div>
            <div className="ppf-xp">
              <div className="ppf-xp__row">
                <span className="ppf-xp__val">{gam.xp} XP</span>
                <span className="ppf-xp__max">
                  {gam.xp}/{next}
                </span>
              </div>
              <div
                className="ppf-xp__bar"
                role="progressbar"
                aria-valuenow={gam.xp}
                aria-valuemax={next}
              >
                <div className="ppf-xp__fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="ppf-hint">Toque para ver detalhes completos</div>
          </div>
        </section>

        {/* achievements */}
        <section className="ppf-card">
          <div className="ppf-card__head">
            <h2>
              <Trophy /> Conquistas
            </h2>
            <span className="ppf-count">
              {unlockedCount}/{gam.achievements.length} →
            </span>
          </div>
          <div className="ppf-ach">
            {shown.map((a) => (
              <div
                key={a.key}
                className="ppf-ach__item"
                data-unlocked={a.unlocked}
                aria-label={a.name}
                title={a.name}
              >
                {a.unlocked ? <Medal /> : <Lock />}
              </div>
            ))}
            {overflow > 0 && (
              <div className="ppf-ach__item ppf-ach__more">+{overflow}</div>
            )}
          </div>
          <div className="ppf-hint">Toque para ver todas as conquistas</div>
        </section>

        {/* plan */}
        <section className="ppf-card">
          <div className="ppf-card__head">
            <h2>
              <Crown /> Seu Plano
            </h2>
          </div>
          <div className="ppf-plan">
            <span>
              Plano atual: <b>{me.planName}</b>
            </span>
            <button
              className="ppf-upgrade"
              onClick={() =>
                onUpgrade ? onUpgrade() : window.open(CHECKOUT_URL, '_blank')
              }
            >
              <Rocket /> Upgrade
            </button>
          </div>
        </section>

        {/* feedback */}
        <section className="ppf-card">
          <div className="ppf-card__head">
            <h2>
              <Chat /> Feedback
            </h2>
          </div>
          <p className="ppf-desc">
            Encontrou um problema ou tem uma sugestão? Nos conte.
          </p>
          <button
            className="ppf-action"
            onClick={() => window.open(FEEDBACK_URL, '_blank')}
          >
            <Chat /> Enviar Feedback
          </button>
        </section>

        {/* support */}
        <section className="ppf-card">
          <div className="ppf-card__head">
            <h2>
              <Headset /> Suporte
            </h2>
          </div>
          <p className="ppf-desc">
            Precisa de ajuda? Nossa equipe está pronta para atendê-lo.
          </p>
          <button
            className="ppf-action"
            onClick={() => window.open(SUPPORT_URL, '_blank')}
          >
            <Chat /> Falar com Suporte
          </button>
        </section>

        {/* logout */}
        <section className="ppf-card">
          <p className="ppf-desc">
            Deseja sair da sua conta? Você precisará fazer login novamente.
          </p>
          <button className="ppf-action ppf-action--danger" onClick={onLogout}>
            <Power /> Sair da Conta
          </button>
        </section>
      </div>
    </main>
  );
}

/* ---- inline icons ---- */
function Ball() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 7.5l3 2.2-1.1 3.5h-3.8L9 9.7 12 7.5z"
        fill="currentColor"
      />
      <path
        d="M12 3v2M4.5 9l1.8 1M19.5 9l-1.8 1M7 20l1.2-2M17 20l-1.2-2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
function Star() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.9 6.1 21l1.1-6.5L2.5 9.9l6.5-.95L12 2.5z" />
    </svg>
  );
}
function Trophy() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3M12 13v3M9 20h6M10 20l.5-2.5h3L14 20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function Medal() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l1.7 3.6 3.9.5-2.9 2.7.8 3.9L12 11.3 8.5 12.7l.8-3.9L6.4 6.1l3.9-.5L12 2z" />
    </svg>
  );
}
function Lock() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
function Crown() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 8l3.5 3L12 5l4.5 6L20 8l-1.5 10h-13L4 8z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}
function Rocket() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14 4c3 1 5 4 6 6-2 1-3 2-4 4-2-.5-4-2-5-4s-.5-4 3-6z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 14l-3 3M6 12l-2 4 4-2M13 11h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function Chat() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 5h16v11H9l-4 3v-3H4V5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}
function Headset() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 13v-1a7 7 0 0 1 14 0v1M4 13h3v5H5a1 1 0 0 1-1-1v-4zM20 13h-3v5h2a1 1 0 0 0 1-1v-4z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}
function Power() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v8M7.5 6.5a7 7 0 1 0 9 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
