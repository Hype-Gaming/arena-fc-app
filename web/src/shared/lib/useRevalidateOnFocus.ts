import { useEffect } from 'react';

/**
 * Calls `onRevalidate` whenever the tab returns to the foreground — a window
 * `focus` or the document becoming visible again.
 *
 * The app opens the external checkout in another tab, and the paid plan only
 * lands once the payment webhook creates the subscription (async). Revalidating
 * plan-derived state on return means a fresh premium buyer stops seeing the
 * free experience without having to reload the page.
 *
 * `onRevalidate` should be stable (wrap it in useCallback) so the listeners
 * aren't torn down and re-added on every render.
 */
export function useRevalidateOnFocus(onRevalidate: () => void): void {
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') onRevalidate();
    };
    window.addEventListener('focus', handler);
    document.addEventListener('visibilitychange', handler);
    return () => {
      window.removeEventListener('focus', handler);
      document.removeEventListener('visibilitychange', handler);
    };
  }, [onRevalidate]);
}
