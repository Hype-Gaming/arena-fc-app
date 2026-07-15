import { useCallback, useEffect, useState } from 'react';
import { api as defaultApi, type ApiClient } from './apiClient';
import { useRevalidateOnFocus } from './useRevalidateOnFocus';

export interface TelegramGateState {
  /** Whether the gate applies to this user at all (paid plans only). */
  applies: boolean;
  clicked: boolean;
  clickedAt: string | null;
  unlocked: boolean;
  waitSeconds: number;
  remainingSeconds: number;
}

export interface TelegramGate {
  state: TelegramGateState | null;
  /** True until we positively know the gate is locked (never trap on a fetch error). */
  unlocked: boolean;
  /** Record the Telegram click (starts the wait) and refresh local state. */
  click: () => Promise<void>;
  refresh: () => void;
}

/**
 * Drives the first-access Telegram gate: reads the server state, records the
 * click that starts the 10-minute wait, and ticks a local countdown so the UI
 * updates without polling every second. Revalidates when the tab regains focus
 * (the user returns from the Telegram tab).
 */
export function useTelegramGate(
  api: Pick<ApiClient, 'get' | 'post'> = defaultApi,
): TelegramGate {
  const [state, setState] = useState<TelegramGateState | null>(null);

  const refresh = useCallback(() => {
    api
      .get<TelegramGateState>('/me/telegram-gate')
      .then(setState)
      .catch(() => {
        /* best-effort: if we can't read it, don't trap the user */
      });
  }, [api]);

  useEffect(refresh, [refresh]);
  useRevalidateOnFocus(refresh);

  // Local countdown while waiting: set the interval up once (keyed on clicked +
  // unlocked), decrement each tick, and flip to unlocked at zero.
  useEffect(() => {
    if (!state?.clicked || state.unlocked) return;
    const id = setInterval(() => {
      setState((s) => {
        if (!s || s.unlocked) return s;
        const remainingSeconds = Math.max(0, s.remainingSeconds - 1);
        return { ...s, remainingSeconds, unlocked: remainingSeconds === 0 };
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.clicked, state?.unlocked]);

  const click = useCallback(async () => {
    try {
      const next = await api.post<TelegramGateState>('/me/telegram-gate/click');
      setState(next);
    } catch {
      /* ignore — the CTA still opens Telegram */
    }
  }, [api]);

  const unlocked = state ? state.unlocked : true;

  return { state, unlocked, click, refresh };
}
