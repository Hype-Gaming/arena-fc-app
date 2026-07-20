// api/src/common/filters/all-exceptions.filter.ts
import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { logJson } from '../logging/structured-logger';

/**
 * Catch-all filter that logs every errored request as a structured line, then
 * delegates to Nest's BaseExceptionFilter so the HTTP response shape is exactly
 * the framework default (nothing else changes). 5xx are logged with a stack (an
 * unexpected server fault we must be able to trace); 4xx are logged as warnings
 * without a stack (expected client errors — a bad token, a 429, a 404).
 *
 * Registered BEFORE InsufficientCreditsFilter in main.ts: Nest evaluates global
 * filters in reversed registration order and picks the first whose @Catch
 * matches, so the specific credits filter (registered last) still wins for its
 * own error, and everything else falls through to this one.
 */
@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() === 'http') {
      const req = host.switchToHttp().getRequest();
      const status =
        exception instanceof HttpException ? exception.getStatus() : 500;
      const isServerError = status >= 500;

      logJson(isServerError ? 'error' : 'warn', 'request_error', {
        requestId: req?.requestId,
        method: req?.method,
        path: req?.originalUrl ?? req?.url,
        statusCode: status,
        userId: req?.user?.userId,
        error: exception instanceof Error ? exception.message : String(exception),
        stack:
          isServerError && exception instanceof Error
            ? exception.stack
            : undefined,
      });
    }

    super.catch(exception, host);
  }
}
