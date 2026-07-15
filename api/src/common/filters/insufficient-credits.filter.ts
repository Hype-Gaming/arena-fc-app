import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { InsufficientCreditsError } from '../../modules/credits/errors';

/**
 * Maps the domain error `InsufficientCreditsError` (a plain Error thrown deep
 * in the credits ledger) to a clean HTTP 402 Payment Required response so the
 * frontend can show a "buy credits" CTA instead of choking on a generic 500.
 *
 * Registered globally (see main.ts) so it covers every route that may debit
 * credits (tips unlock today, IA Tipster analyze tomorrow) without per-handler
 * try/catch.
 */
@Catch(InsufficientCreditsError)
export class InsufficientCreditsFilter implements ExceptionFilter {
  catch(error: InsufficientCreditsError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    response.status(HttpStatus.PAYMENT_REQUIRED).json({
      statusCode: HttpStatus.PAYMENT_REQUIRED,
      error: 'INSUFFICIENT_CREDITS',
      message: error.message,
      currentBalance: error.currentBalance,
      // `amount` is the attempted delta (negative for a debit); surface the
      // magnitude the user would need to cover it.
      required: Math.abs(error.amount),
    });
  }
}
