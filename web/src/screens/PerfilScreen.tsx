// web/src/screens/PerfilScreen.tsx
import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { ApiClient } from '../shared/lib/apiClient';
import { CHECKOUT_URL } from '../shared/lib/checkout';
import './PerfilScreen.css';

interface MeProfile {
  email: string;
  nickname: string | null;
  avatarKey: string | null;
  planKey: string;
  planName: string;
  creditBalance: number;
}

interface AchievementStatus {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rewardXp: number;
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
  currentLoginStreak: number;
  bestLoginStreak: number;
  achievements: AchievementStatus[];
}

interface Props {
  api: Pick<ApiClient, 'get' | 'patch'>;
  onLogout: () => void;
  /** Opens the plan comparison. Falls back to the external checkout when absent. */
  onUpgrade?: () => void;
}

type AchievementGroupKey = 'permanent' | 'streak' | 'daily';

const env = import.meta.env as Record<string, string | undefined>;
const SUPPORT_URL = env.VITE_SUPPORT_URL ?? 'https://wa.me/5500000000000';
const FEEDBACK_URL = env.VITE_FEEDBACK_URL ?? 'mailto:contato@arenafc.app';

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

const GROUP_META: Record<
  AchievementGroupKey,
  { label: string; tone: string; icon: () => JSX.Element }
> = {
  permanent: { label: 'Conquistas Permanentes', tone: 'green', icon: Trophy },
  streak: { label: 'Conquistas de Streak', tone: 'orange', icon: Flame },
  daily: { label: 'Conquistas Diarias', tone: 'cyan', icon: Calendar },
};

// Preset avatar emblems — must mirror AVATAR_KEYS on the API (avatar.constants.ts).
const AVATAR_META: Record<string, { icon: () => JSX.Element; tone: string }> = {
  ball: { icon: Ball, tone: 'green' },
  flame: { icon: Flame, tone: 'orange' },
  crown: { icon: Crown, tone: 'gold' },
  shield: { icon: Shield, tone: 'blue' },
  rocket: { icon: Rocket, tone: 'violet' },
  star: { icon: Spark, tone: 'cyan' },
  bolt: { icon: Bolt, tone: 'yellow' },
  trophy: { icon: Trophy, tone: 'gold' },
};
const AVATAR_KEYS = Object.keys(AVATAR_META);
const DEFAULT_AVATAR = 'ball';

function levelName(level: number): string {
  return LEVEL_NAMES[level - 1] ?? 'Elite';
}

function displayName(me: MeProfile): string {
  if (me.nickname && me.nickname.trim()) return me.nickname.trim();
  return me.email.split('@')[0] || me.email;
}

function achievementGroup(a: AchievementStatus): AchievementGroupKey {
  if (a.category === 'streak' || a.category === 'daily') return a.category;
  return 'permanent';
}

function formatUnlockedAt(value: string | null): string {
  if (!value) return 'Bloqueada';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(new Date(value));
}

function AvatarEmblem({ avatarKey }: { avatarKey: string | null }) {
  const meta = AVATAR_META[avatarKey ?? ''] ?? AVATAR_META[DEFAULT_AVATAR];
  const Icon = meta.icon;
  return (
    <span className="pf-emblem" data-tone={meta.tone} aria-hidden="true">
      <Icon />
    </span>
  );
}

export function PerfilScreen({ api, onLogout, onUpgrade }: Props) {
  const [me, setMe] = useState<MeProfile | null>(null);
  const [gam, setGam] = useState<GamificationProfile | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<MeProfile>('/me').then(setMe);
    api.get<GamificationProfile>('/gamification/me').then(setGam);
  }, [api]);

  const groups = useMemo(() => {
    const grouped: Record<AchievementGroupKey, AchievementStatus[]> = {
      permanent: [],
      streak: [],
      daily: [],
    };
    for (const achievement of gam?.achievements ?? []) {
      grouped[achievementGroup(achievement)].push(achievement);
    }
    return grouped;
  }, [gam?.achievements]);

  async function saveProfile(patch: { nickname?: string; avatarKey?: string }) {
    setSaving(true);
    try {
      const updated = await api.patch<MeProfile>('/me/profile', patch);
      setMe(updated);
    } catch {
      // Keep the current profile; the control stays where it is so the user can retry.
    } finally {
      setSaving(false);
    }
  }

  async function pickAvatar(key: string) {
    setAvatarPickerOpen(false);
    if (me && key !== me.avatarKey) await saveProfile({ avatarKey: key });
  }

  function startEditingNickname() {
    setNicknameDraft(me?.nickname ?? '');
    setEditingNickname(true);
  }

  async function saveNickname() {
    const value = nicknameDraft.trim();
    if (value.length < 2 || value.length > 24) return;
    await saveProfile({ nickname: value });
    setEditingNickname(false);
  }

  if (!me || !gam) {
    return (
      <main className="pf-perfil">
        <p className="pf-perfil__loading">Carregando...</p>
      </main>
    );
  }

  const isPaid = me.planKey !== 'free';
  const next = gam.nextLevelXp ?? gam.xp;
  const span = Math.max(1, next - gam.currentLevelFloor);
  const pct = Math.min(
    100,
    Math.max(0, ((gam.xp - gam.currentLevelFloor) / span) * 100),
  );
  const unlockedCount = gam.achievements.filter((a) => a.unlocked).length;
  const totalProgress = `${unlockedCount}/${gam.achievements.length}`;
  const featured = gam.achievements.slice(0, 7);
  const overflow = Math.max(0, gam.achievements.length - featured.length);
  const currentStreak = gam.currentLoginStreak;
  const bestStreak = gam.bestLoginStreak;

  const openDetailFromKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setDetailOpen(true);
    }
  };

  return (
    <main className="pf-perfil">
      <div className="pf-perfil__inner">
        <section
          className="pf-hero pf-hero--button"
          aria-label="Perfil do usuario"
          role="button"
          tabIndex={0}
          onClick={() => setDetailOpen(true)}
          onKeyDown={openDetailFromKeyboard}
        >
          <div className="pf-hero__avatar">
            <AvatarEmblem avatarKey={me.avatarKey} />
          </div>
          <div className="pf-hero__body">
            <div className="pf-hero__name">{displayName(me)}</div>
            <div className="pf-hero__email">{me.email}</div>

            <div className="pf-hero__badges">
              <span className={isPaid ? 'pf-pill pf-pill--plan' : 'pf-pill'}>
                <Crown /> Plano {me.planName}
              </span>
              <span className="pf-pill pf-pill--level">
                <Shield /> Nivel {gam.level} - {levelName(gam.level)}
              </span>
              {currentStreak > 0 && (
                <span className="pf-pill pf-pill--streak">
                  <Flame /> {currentStreak}d
                </span>
              )}
            </div>

            <div className="pf-xp">
              <div className="pf-xp__row">
                <span>{gam.xp} XP</span>
                <span>
                  {gam.xp}/{next}
                </span>
              </div>
              <div
                className="pf-xp__bar"
                role="progressbar"
                aria-valuenow={gam.xp}
                aria-valuemax={next}
              >
                <div className="pf-xp__fill" style={{ width: `${pct}%` }} />
              </div>
            </div>

            <span className="pf-link-btn">Toque para ver detalhes completos</span>
          </div>
        </section>

        <button
          type="button"
          className="pf-card pf-achievement-summary"
          onClick={() => setDetailOpen(true)}
        >
          <div className="pf-card__head">
            <h2>
              <Trophy /> Conquistas
            </h2>
            <span>{totalProgress} {'->'}</span>
          </div>
          <div className="pf-ach-strip">
            {featured.map((achievement) => (
              <span
                key={achievement.key}
                className="pf-ach-strip__item"
                data-unlocked={achievement.unlocked}
                aria-label={achievement.name}
                title={achievement.name}
              >
                {achievement.unlocked ? iconForAchievement(achievement) : <Lock />}
              </span>
            ))}
            {overflow > 0 && <span className="pf-ach-strip__more">+{overflow}</span>}
          </div>
          <span className="pf-link-btn">Toque para ver todas as conquistas</span>
        </button>

        <section className="pf-card">
          <div className="pf-card__head">
            <h2>
              <Crown /> Seu Plano
            </h2>
          </div>
          <div className="pf-plan">
            <span>
              Plano atual: <b>{me.planName}</b>
            </span>
            <button
              type="button"
              className="pf-action pf-action--primary"
              onClick={() =>
                onUpgrade ? onUpgrade() : window.open(CHECKOUT_URL, '_blank')
              }
            >
              <Rocket /> Upgrade
            </button>
          </div>
        </section>

        <div className="pf-actions">
          <section className="pf-card pf-service-card">
            <div className="pf-card__head">
              <h2>
                <Chat /> Feedback
              </h2>
            </div>
            <p className="pf-desc">Encontrou um problema ou tem uma sugestao? Nos conte.</p>
            <button
              type="button"
              className="pf-action pf-action--outline"
              onClick={() => window.open(FEEDBACK_URL, '_blank')}
            >
              <Chat /> Enviar Feedback
            </button>
          </section>

          <section className="pf-card pf-service-card">
            <div className="pf-card__head">
              <h2>
                <Headset /> Suporte
              </h2>
            </div>
            <p className="pf-desc">Precisa de ajuda? Nossa equipe esta pronta para atende-lo.</p>
            <button
              type="button"
              className="pf-action pf-action--outline"
              onClick={() => window.open(SUPPORT_URL, '_blank')}
            >
              <Chat /> Falar com Suporte
            </button>
          </section>

          <section className="pf-card pf-service-card">
            <p className="pf-desc pf-desc--muted">Deseja sair da sua conta? Voce precisara fazer login novamente.</p>
            <button type="button" className="pf-action pf-action--danger" onClick={onLogout}>
              <Power /> Sair da Conta
            </button>
          </section>
        </div>
      </div>

      {detailOpen && (
        <div
          className="pf-detail"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDetailOpen(false);
          }}
        >
          <section
            className="pf-detail__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Perfil completo"
          >
            <div className="pf-detail__head">
              <h2>Perfil completo</h2>
              <button type="button" className="pf-icon-btn" aria-label="Fechar perfil completo" onClick={() => setDetailOpen(false)}>
                <Close />
              </button>
            </div>

            <section className="pf-full-hero">
              <button
                type="button"
                className="pf-full-hero__avatar-btn"
                aria-label="Trocar avatar"
                onClick={() => setAvatarPickerOpen((v) => !v)}
              >
                <span className="pf-full-hero__avatar">
                  <AvatarEmblem avatarKey={me.avatarKey} />
                </span>
                <span className="pf-full-hero__avatar-note">Toque para trocar avatar</span>
              </button>

              {avatarPickerOpen && (
                <div className="pf-avatar-picker" role="group" aria-label="Escolher avatar">
                  {AVATAR_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      className="pf-avatar-option"
                      aria-label={`Avatar ${key}`}
                      aria-pressed={me.avatarKey === key}
                      data-selected={me.avatarKey === key}
                      disabled={saving}
                      onClick={() => pickAvatar(key)}
                    >
                      <AvatarEmblem avatarKey={key} />
                    </button>
                  ))}
                </div>
              )}

              {editingNickname ? (
                <div className="pf-nickname-edit">
                  <input
                    className="pf-nickname-input"
                    value={nicknameDraft}
                    onChange={(e) => setNicknameDraft(e.target.value)}
                    maxLength={24}
                    placeholder="Seu nickname"
                    aria-label="Nickname"
                    autoFocus
                  />
                  <div className="pf-nickname-actions">
                    <button
                      type="button"
                      className="pf-action pf-action--primary pf-action--sm"
                      onClick={saveNickname}
                      disabled={saving || nicknameDraft.trim().length < 2}
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      className="pf-action pf-action--outline pf-action--sm"
                      onClick={() => setEditingNickname(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="pf-full-hero__nickname"
                  onClick={startEditingNickname}
                >
                  {me.nickname ? me.nickname : 'Definir Nickname'}
                </button>
              )}
              <p>{me.email}</p>

              <div className="pf-full-hero__badges">
                <span className={isPaid ? 'pf-pill pf-pill--plan' : 'pf-pill'}>
                  <Trophy /> Plano {me.planName}
                </span>
                <span className="pf-pill pf-pill--level">
                  <Spark /> Nivel {gam.level} - {levelName(gam.level)}
                </span>
              </div>

              <div className="pf-xp">
                <div className="pf-xp__row">
                  <span>{gam.xp} XP total</span>
                  <span>
                    {gam.xp - gam.currentLevelFloor}/{Math.max(1, next - gam.currentLevelFloor)} XP
                  </span>
                </div>
                <div
                  className="pf-xp__bar"
                  role="progressbar"
                  aria-valuenow={gam.xp}
                  aria-valuemax={next}
                >
                  <div className="pf-xp__fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </section>

            <section className="pf-full-stats" aria-label="Resumo detalhado do perfil">
              <SummaryStat icon={<Flame />} label="Streak Atual" value={`${currentStreak} dias`} tone="orange" />
              <SummaryStat icon={<Trophy />} label="Maior Streak" value={`${bestStreak} dias`} tone="gold" />
              <SummaryStat icon={<Spark />} label="Conquistas" value={totalProgress} tone="cyan" />
            </section>

            <div className="pf-full-sections">
              {(Object.keys(GROUP_META) as AchievementGroupKey[]).map((groupKey) => {
                const meta = GROUP_META[groupKey];
                const Icon = meta.icon;
                const achievements = groups[groupKey];
                const groupUnlocked = achievements.filter((a) => a.unlocked).length;

                return (
                  <DetailAchievementSection
                    key={groupKey}
                    achievements={achievements}
                    count={`${groupUnlocked}/${achievements.length}`}
                    currentStreak={currentStreak}
                    icon={<Icon />}
                    label={meta.label}
                    tone={meta.tone}
                    type={groupKey}
                  />
                );
              })}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function SummaryStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: JSX.Element;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <article className="pf-summary-stat" data-tone={tone}>
      <span>{icon}</span>
      <small>{label}</small>
      <b>{value}</b>
    </article>
  );
}

function DetailAchievementSection({
  achievements,
  count,
  currentStreak,
  icon,
  label,
  tone,
  type,
}: {
  achievements: AchievementStatus[];
  count: string;
  currentStreak: number;
  icon: JSX.Element;
  label: string;
  tone: string;
  type: AchievementGroupKey;
}) {
  const shown = achievements.slice(0, type === 'streak' ? 12 : 6);
  const nextLocked = achievements.find((item) => !item.unlocked);

  return (
    <section className="pf-full-section" data-tone={tone}>
      <div className="pf-full-section__head">
        <h3>
          {icon} {label}
        </h3>
        <span>{count}</span>
      </div>

      {type === 'streak' && nextLocked && (
        <div className="pf-next-ach">
          <span>Proximo: </span>
          <b>{nextLocked.name}</b>
          <span> - faltam </span>
          <b>{Math.max(0, nextLocked.threshold - currentStreak)} dias</b>
        </div>
      )}

      {shown.length === 0 ? (
        <p className="pf-empty">Nenhuma conquista nesta categoria ainda.</p>
      ) : type === 'streak' ? (
        <div className="pf-streak-list">
          {shown.map((achievement) => (
            <AchievementRow key={achievement.key} achievement={achievement} />
          ))}
        </div>
      ) : (
        <div className="pf-full-grid">
          {shown.map((achievement) => (
            <AchievementTile key={achievement.key} achievement={achievement} compact />
          ))}
        </div>
      )}
    </section>
  );
}

function AchievementTile({
  achievement,
  compact = false,
}: {
  achievement: AchievementStatus;
  compact?: boolean;
}) {
  const progress = Math.min(100, (achievement.progress / Math.max(1, achievement.threshold)) * 100);
  return (
    <div
      className="pf-ach-tile"
      data-unlocked={achievement.unlocked}
      aria-label={achievement.name}
    >
      <div className="pf-ach-tile__icon">
        {achievement.unlocked ? iconForAchievement(achievement) : <Lock />}
      </div>
      <b>{achievement.name}</b>
      {!compact && <span>{achievement.description}</span>}
      <small>
        {achievement.progress}/{achievement.threshold}
      </small>
      {achievement.rewardXp > 0 && <span className="pf-ach-reward">+{achievement.rewardXp} XP</span>}
      <div className="pf-mini-bar" aria-hidden="true">
        <div style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function AchievementRow({ achievement }: { achievement: AchievementStatus }) {
  const progress = Math.min(100, (achievement.progress / Math.max(1, achievement.threshold)) * 100);
  return (
    <article className="pf-ach-row" data-unlocked={achievement.unlocked}>
      <div className="pf-ach-row__icon">
        {achievement.unlocked ? iconForAchievement(achievement) : <Lock />}
      </div>
      <div className="pf-ach-row__body">
        <div className="pf-ach-row__top">
          <b>{achievement.name}</b>
          <span>
            {achievement.progress}/{achievement.threshold}
          </span>
        </div>
        <p>{achievement.description}</p>
        <div className="pf-mini-bar" aria-label={`${achievement.name} progresso`}>
          <div style={{ width: `${progress}%` }} />
        </div>
        <div className="pf-ach-row__foot">
          <small>{formatUnlockedAt(achievement.unlockedAt)}</small>
          {achievement.rewardXp > 0 && <small className="pf-ach-reward">+{achievement.rewardXp} XP</small>}
        </div>
      </div>
    </article>
  );
}

function iconForAchievement(a: AchievementStatus) {
  if (a.category === 'streak' || a.icon.includes('flame')) return <Flame />;
  if (a.key.includes('green') || a.icon.includes('star')) return <Spark />;
  if (a.key.includes('level')) return <Shield />;
  if (a.key.includes('referral')) return <Users />;
  if (a.key.includes('unlock')) return <Ticket />;
  return <Trophy />;
}

function IconBase({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

function Ball() {
  return (
    <IconBase>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.2l3.1 2.3-1.2 3.7h-3.8L8.9 9.5 12 7.2z" fill="currentColor" />
      <path d="M12 3v3M4.7 9.2l2.5 1.2M19.3 9.2l-2.5 1.2M7.4 19.5l1.4-2.6M16.6 19.5l-1.4-2.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </IconBase>
  );
}

function Bolt() {
  return (
    <IconBase>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15" />
    </IconBase>
  );
}

function Calendar() {
  return (
    <IconBase>
      <rect x="4" y="5" width="16" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </IconBase>
  );
}

function Chat() {
  return (
    <IconBase>
      <path d="M4 5h16v11H9l-4 3v-3H4V5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </IconBase>
  );
}

function Close() {
  return (
    <IconBase>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}

function Crown() {
  return (
    <IconBase>
      <path d="M4 8l3.5 3L12 5l4.5 6L20 8l-1.5 10h-13L4 8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </IconBase>
  );
}

function Flame() {
  return (
    <IconBase>
      <path d="M12 21c-3.6 0-6.5-2.5-6.5-6.2 0-2.6 1.7-4.6 3.5-6.4.4 2.1 1.4 3.2 2.8 4.1-.2-3.1 1.2-5.4 3.4-7.5.4 3.4 3.3 5.4 3.3 9.5 0 3.9-2.9 6.5-6.5 6.5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </IconBase>
  );
}

function Headset() {
  return (
    <IconBase>
      <path d="M5 13v-1a7 7 0 0 1 14 0v1M4 13h3v5H5a1 1 0 0 1-1-1v-4zM20 13h-3v5h2a1 1 0 0 0 1-1v-4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </IconBase>
  );
}

function Lock() {
  return (
    <IconBase>
      <rect x="5" y="10" width="14" height="10" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </IconBase>
  );
}

function Power() {
  return (
    <IconBase>
      <path d="M12 3v8M7.5 6.5a7 7 0 1 0 9 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </IconBase>
  );
}

function Rocket() {
  return (
    <IconBase>
      <path d="M4.5 16.5c-1.1 1.1-1.5 3.4-1.5 3.4s2.3-.4 3.4-1.5c.6-.6.6-1.4 0-2s-1.4-.5-1.9.1z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 15l-3-3a18.7 18.7 0 0 1 7.4-8.1c2.4-1.3 4.1-.8 4.1-.8s.5 1.7-.8 4.1A18.7 18.7 0 0 1 12 15z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12H5l2-4h4M12 15v4l4-2v-4M14 7h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

function Shield() {
  return (
    <IconBase>
      <path d="M12 3l7 3v5.4c0 4.3-2.8 7.4-7 9.6-4.2-2.2-7-5.3-7-9.6V6l7-3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

function Spark() {
  return (
    <IconBase>
      <path d="M12 3l1.6 5.1L19 10l-5.4 1.9L12 17l-1.6-5.1L5 10l5.4-1.9L12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M19 16v4M21 18h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </IconBase>
  );
}

function Ticket() {
  return (
    <IconBase>
      <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 8v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="1.5 2.5" />
    </IconBase>
  );
}

function Trophy() {
  return (
    <IconBase>
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3M12 13v3M9 20h6M10 20l.5-2.5h3L14 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

function Users() {
  return (
    <IconBase>
      <path d="M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3.5 20c.5-3 2.6-5 5.5-5s5 2 5.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M17 11a3 3 0 1 0 0-6M16 15c2.4.2 4 1.9 4.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </IconBase>
  );
}
