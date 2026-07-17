import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FreeOddModal } from './FreeOddModal';

describe('FreeOddModal', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens the configured free-odds Telegram group', async () => {
    const user = userEvent.setup();
    const open = vi.fn();
    vi.stubGlobal('open', open);

    render(<FreeOddModal open onClose={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /resgatar odd gr[aá]tis/i }));

    expect(open).toHaveBeenCalledWith(
      'https://t.me/+Lnc41ngjDLdjNzcx',
      '_blank',
      'noopener,noreferrer',
    );
  });
});
