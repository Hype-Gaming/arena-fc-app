import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { ApiClient } from '../lib/apiClient';
import { useTelegramGate, type TelegramGateState } from '../lib/useTelegramGate';
import './TelegramGate.css';

const TELEGRAM_URL =
  (import.meta.env.VITE_TELEGRAM_URL as string | undefined) ??
  'https://t.me/arenaofc_bot?start=onboarding';

interface GateContextValue {
  unlocked: boolean;
  /** Runs `action` if unlocked; otherwise opens the gate popup and returns false. */
  requireUnlock: (action?: () => void) => boolean;
}

const GateContext = createContext<GateContextValue>({
  unlocked: true,
  requireUnlock: (action) => {
    action?.();
    return true;
  },
});

/** Gate the main app functions behind the first-access Telegram wait. */
export function useGate(): GateContextValue {
  return useContext(GateContext);
}

export function TelegramGateProvider({
  children,
  api,
}: {
  children: ReactNode;
  api?: Pick<ApiClient, 'get' | 'post'>;
}) {
  const { state, unlocked, click } = useTelegramGate(api);
  const [open, setOpen] = useState(false);
  const pending = useRef<(() => void) | null>(null);

  const requireUnlock = useCallback(
    (action?: () => void) => {
      if (unlocked) {
        action?.();
        return true;
      }
      pending.current = action ?? null;
      setOpen(true);
      return false;
    },
    [unlocked],
  );

  const close = useCallback(() => {
    setOpen(false);
    pending.current = null;
  }, []);

  const proceed = useCallback(() => {
    const action = pending.current;
    pending.current = null;
    setOpen(false);
    action?.();
  }, []);

  return (
    <GateContext.Provider value={{ unlocked, requireUnlock }}>
      {children}
      {open && (
        <TelegramGateModal
          state={state}
          onEnterTelegram={() => {
            void click();
            window.open(TELEGRAM_URL, '_blank');
          }}
          onOpenTelegram={() => window.open(TELEGRAM_URL, '_blank')}
          onProceed={proceed}
          onClose={close}
        />
      )}
    </GateContext.Provider>
  );
}

function formatWait(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function TelegramGateModal({
  state,
  onEnterTelegram,
  onOpenTelegram,
  onProceed,
  onClose,
}: {
  state: TelegramGateState | null;
  onEnterTelegram: () => void;
  onOpenTelegram: () => void;
  onProceed: () => void;
  onClose: () => void;
}) {
  const clicked = state?.clicked ?? false;
  const unlocked = state?.unlocked ?? false;
  const remaining = state?.remainingSeconds ?? state?.waitSeconds ?? 600;

  return (
    <div
      className="tg-gate__overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tg-gate-title"
      onClick={onClose}
    >
      <div className="tg-gate__card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="tg-gate__close"
          aria-label="Fechar"
          onClick={onClose}
        >
          <CloseIcon />
        </button>

        <span className="tg-gate__badge" aria-hidden="true">
          <PaperPlane />
        </span>

        {!clicked && (
          <>
            <h3 id="tg-gate-title" className="tg-gate__title">
              Confirme sua banca no Telegram
            </h3>
            <p className="tg-gate__body">
              Para liberar as funções do app, entre no nosso grupo oficial do
              Telegram e confirme sua banca. O acesso é liberado{' '}
              {Math.round((state?.waitSeconds ?? 600) / 60)} minutos depois.
            </p>
            <button
              type="button"
              className="tg-gate__cta"
              onClick={onEnterTelegram}
            >
              <PaperPlane /> Entrar no Telegram
            </button>
          </>
        )}

        {clicked && !unlocked && (
          <>
            <h3 id="tg-gate-title" className="tg-gate__title">
              Quase lá!
            </h3>
            <p className="tg-gate__body">
              Recebemos seu acesso ao Telegram. Aguarde a liberação — o app
              destrava sozinho quando o tempo acabar.
            </p>
            <div className="tg-gate__timer" role="timer" aria-live="polite">
              {formatWait(remaining)}
            </div>
            <button
              type="button"
              className="tg-gate__cta tg-gate__cta--ghost"
              onClick={onOpenTelegram}
            >
              <PaperPlane /> Abrir o Telegram de novo
            </button>
          </>
        )}

        {unlocked && (
          <>
            <h3 id="tg-gate-title" className="tg-gate__title">
              Acesso liberado!
            </h3>
            <p className="tg-gate__body">
              Tudo pronto. Agora você tem acesso completo às funções do app.
            </p>
            <button type="button" className="tg-gate__cta" onClick={onProceed}>
              Continuar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function PaperPlane() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M20.7 4.2 3.8 10.7c-1.1.4-1.1 1.1-.2 1.4l4.3 1.3 1.7 5.2c.2.6.3.8.7.8.3 0 .5-.1.8-.4l2.1-2 4.4 3.2c.8.5 1.4.3 1.6-.8l2.9-13.6c.3-1.2-.4-1.8-1.4-1.4Z"
        fill="currentColor"
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
