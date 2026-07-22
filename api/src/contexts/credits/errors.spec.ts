// api/src/modules/credits/errors.spec.ts
import { InsufficientCreditsError } from './errors';

describe('InsufficientCreditsError', () => {
  it('carries the userId, current balance and attempted delta in its message and fields', () => {
    const err = new InsufficientCreditsError('user-1', 5, -10);

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('InsufficientCreditsError');
    expect(err.userId).toBe('user-1');
    expect(err.currentBalance).toBe(5);
    expect(err.amount).toBe(-10);
    expect(err.message).toContain('user-1');
    expect(err.message).toContain('5');
    expect(err.message).toContain('-10');
  });
});
