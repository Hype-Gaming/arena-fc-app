import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  claimTelegramUnlock,
  fetchLatestTutorial,
  fetchTelegramUnlockStatus,
  startTelegramUnlock,
  type TelegramUnlockStatus,
  type Tutorial,
} from '../api/tutorialApi';

const TELEGRAM_URL =
  (import.meta.env.VITE_TELEGRAM_URL as string | undefined) ??
  'https://t.me/+arena_fc';

const SEEN_KEY = 'tutorialSeenVersion';
const WAIT_SECONDS = 10 * 60;
const BENEFITS = ['Bilhetes Pro', 'Ultra', 'Alavancagem', 'Multiplas'];

type FlowPhase = 'intro' | 'telegram' | 'waiting' | 'complete';

function formatRemaining(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function TutorialOverlay() {
  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<FlowPhase>('intro');
  const [unlock, setUnlock] = useState<TelegramUnlockStatus | null>(null);
  const [remaining, setRemaining] = useState(WAIT_SECONDS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    Promise.allSettled([fetchLatestTutorial(), fetchTelegramUnlockStatus()]).then(
      ([tutorialResult, unlockResult]) => {
        if (!active || tutorialResult.status !== 'fulfilled') return;
        const latest = tutorialResult.value;
        if (latest.steps.length === 0) return;

        const seen = localStorage.getItem(SEEN_KEY);
        const unlockStatus =
          unlockResult.status === 'fulfilled' ? unlockResult.value : null;

        setTutorial(latest);
        setUnlock(unlockStatus);
        setRemaining(unlockStatus?.remainingSeconds ?? WAIT_SECONDS);

        if (unlockStatus?.unlockedAt) {
          setPhase('complete');
          setOpen(seen !== String(latest.version));
          return;
        }
        if (unlockStatus?.startedAt) {
          setPhase('waiting');
          setOpen(true);
          return;
        }

        if (seen !== String(latest.version)) setOpen(true);
      },
    );

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open || phase !== 'waiting' || unlock?.unlockedAt) return;
    const id = window.setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [open, phase, unlock?.unlockedAt]);

  const visibleStep = tutorial?.steps[stepIndex];
  const isLastIntroStep = tutorial
    ? stepIndex >= tutorial.steps.length - 1
    : true;

  const progressLabel = useMemo(() => {
    if (!tutorial) return '';
    return `${Math.min(stepIndex + 1, tutorial.steps.length)} de ${
      tutorial.steps.length
    }`;
  }, [stepIndex, tutorial]);

  if (!open || !tutorial || !visibleStep) return null;

  function markSeen() {
    localStorage.setItem(SEEN_KEY, String(tutorial!.version));
    setOpen(false);
  }

  function advanceIntro() {
    if (!isLastIntroStep) {
      setStepIndex((i) => i + 1);
      return;
    }
    setPhase('telegram');
  }

  async function joinTelegram() {
    setBusy(true);
    setError(null);
    try {
      const status = await startTelegramUnlock();
      setUnlock(status);
      setRemaining(status.remainingSeconds);
      setPhase('waiting');
      window.open(TELEGRAM_URL, '_blank');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function claimPlan() {
    setBusy(true);
    setError(null);
    try {
      const status = await claimTelegramUnlock();
      setUnlock(status);
      setRemaining(status.remainingSeconds);
      if (status.unlockedAt || status.eligible) {
        setPhase('complete');
        return;
      }
      setPhase('waiting');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const canClaim = remaining === 0 || unlock?.eligible || unlock?.unlockedAt;
  const timerProgress = Math.round(
    ((WAIT_SECONDS - Math.min(remaining, WAIT_SECONDS)) / WAIT_SECONDS) * 100,
  );
  const timerStyle = {
    '--timer-progress': `${timerProgress}%`,
  } as CSSProperties;

  return (
    <div className="tutorial-overlay" role="dialog" aria-modal="true">
      <section className="tutorial-card" data-phase={phase}>
        <button
          type="button"
          className="tutorial-card__close"
          aria-label="Fechar tutorial"
          onClick={markSeen}
        >
          <CloseIcon />
        </button>

        <div className="tutorial-card__brand" aria-hidden="true">
          <img src="/arenafc-logo.png" alt="" />
        </div>

        {phase === 'intro' && (
          <>
            <div className="tutorial-card__kicker">{progressLabel}</div>
            <h3>{visibleStep.title}</h3>
            <p>{visibleStep.body}</p>
            <div className="tutorial-card__steps" aria-hidden="true">
              {tutorial.steps.map((step, i) => (
                <span
                  key={`${step.title}-${i}`}
                  className={
                    i === stepIndex
                      ? 'tutorial-card__dot tutorial-card__dot--active'
                      : 'tutorial-card__dot'
                  }
                />
              ))}
            </div>
            {visibleStep.imageUrl && (
              <img
                className="tutorial-card__image"
                src={visibleStep.imageUrl}
                alt=""
              />
            )}
            <button
              type="button"
              className="tutorial-card__primary"
              onClick={advanceIntro}
            >
              {isLastIntroStep ? 'Liberar app completo' : 'Continuar'}
            </button>
          </>
        )}

        {phase === 'telegram' && (
          <>
            <div className="tutorial-card__kicker">Acesso completo</div>
            <h3>Entre no Telegram da Arena</h3>
            <p>
              Toque no botao abaixo, entre no canal e mantenha esta tela aberta.
              Depois de 10 minutos o plano Diamante fica disponivel para sua
              conta.
            </p>
            <div className="tutorial-card__benefits" aria-label="Beneficios">
              {BENEFITS.map((benefit) => (
                <span key={benefit}>{benefit}</span>
              ))}
            </div>
            <button
              type="button"
              className="tutorial-card__primary"
              onClick={joinTelegram}
              disabled={busy}
            >
              <TelegramIcon />
              {busy ? 'Abrindo...' : 'Entrar pelo Telegram'}
            </button>
            <button
              type="button"
              className="tutorial-card__ghost"
              onClick={markSeen}
            >
              Continuar sem liberar
            </button>
          </>
        )}

        {phase === 'waiting' && (
          <>
            <div className="tutorial-card__kicker">Aguardando confirmacao</div>
            <h3>Fique no canal por 10 minutos</h3>
            <div className="tutorial-card__timer" style={timerStyle}>
              <span>{formatRemaining(remaining)}</span>
            </div>
            <p>
              Quando o contador zerar, confirme aqui para ativar o Diamante e
              desbloquear todas as areas do app.
            </p>
            <button
              type="button"
              className="tutorial-card__primary"
              onClick={claimPlan}
              disabled={busy || !canClaim}
            >
              {busy
                ? 'Verificando...'
                : canClaim
                  ? 'Ativar Diamante'
                  : 'Aguarde o tempo'}
            </button>
          </>
        )}

        {phase === 'complete' && (
          <>
            <div className="tutorial-card__kicker">Plano liberado</div>
            <h3>Diamante ativo</h3>
            <p>
              Pronto. Sua conta agora tem acesso completo aos bilhetes, mercados
              avancados, multiplas e probabilidades Ultra.
            </p>
            <div className="tutorial-card__seal" aria-hidden="true">
              <CheckIcon />
            </div>
            <button
              type="button"
              className="tutorial-card__primary"
              onClick={markSeen}
            >
              Entrar na Arena
            </button>
          </>
        )}

        {error && (
          <p className="tutorial-card__error" role="alert">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M20.7 4.2 3.8 10.7c-1.1.4-1.1 1.1-.2 1.4l4.3 1.3 1.7 5.2c.2.6.3.8.7.8.3 0 .5-.1.8-.4l2.1-2 4.4 3.2c.8.5 1.4.3 1.6-.8l2.9-13.6c.3-1.2-.4-1.8-1.4-1.4Zm-3.1 3.1-8.2 7.4-.3 3.1-1.2-4 9.2-5.9c.4-.3.8-.6.5-.6Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="38" height="38" aria-hidden="true">
      <path
        d="m5 12.5 4.2 4.2L19 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6 6 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
