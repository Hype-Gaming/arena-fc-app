import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { useRevalidateOnFocus } from './useRevalidateOnFocus';

function Probe({ cb }: { cb: () => void }) {
  useRevalidateOnFocus(cb);
  return null;
}

describe('useRevalidateOnFocus', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('revalidates when the window regains focus', () => {
    const cb = vi.fn();
    render(<Probe cb={cb} />);
    expect(cb).not.toHaveBeenCalled();

    window.dispatchEvent(new Event('focus'));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('does not revalidate while the document is hidden', () => {
    const cb = vi.fn();
    render(<Probe cb={cb} />);

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(cb).not.toHaveBeenCalled();
  });

  it('stops listening after unmount', () => {
    const cb = vi.fn();
    const { unmount } = render(<Probe cb={cb} />);
    unmount();

    window.dispatchEvent(new Event('focus'));
    expect(cb).not.toHaveBeenCalled();
  });
});
