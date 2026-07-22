import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { InsufficientCreditsFilter } from './insufficient-credits.filter';
import { InsufficientCreditsError } from '../../contexts/credits/errors';

describe('InsufficientCreditsFilter', () => {
  const filter = new InsufficientCreditsFilter();

  function mockHost() {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost;
    return { host, status, json };
  }

  it('responds 402 with a structured INSUFFICIENT_CREDITS body', () => {
    const { host, status, json } = mockHost();
    // user has 5 credits, attempted a -10 debit
    const error = new InsufficientCreditsError('user-1', 5, -10);

    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.PAYMENT_REQUIRED);
    expect(json).toHaveBeenCalledWith({
      statusCode: 402,
      error: 'INSUFFICIENT_CREDITS',
      message: error.message,
      currentBalance: 5,
      required: 10,
    });
  });

  it('exposes required as the absolute value of the attempted debit', () => {
    const { host, json } = mockHost();
    const error = new InsufficientCreditsError('user-2', 0, -42);

    filter.catch(error, host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ currentBalance: 0, required: 42 }),
    );
  });
});
