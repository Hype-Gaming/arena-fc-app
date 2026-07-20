// api/src/common/logging/logging.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { logJson } from './structured-logger';

/**
 * One structured access-log line per successful HTTP request (method, path,
 * status, latency, request id, user). The error path is intentionally left to
 * AllExceptionsFilter, so a request that throws is logged exactly once — there,
 * with its error detail — instead of twice.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest();
    // The container health probe hits /health every few seconds; logging it
    // would bury real traffic. Skip it.
    if ((req.originalUrl ?? req.url ?? '').startsWith('/health')) {
      return next.handle();
    }

    const start = Date.now();
    return next.handle().pipe(
      tap(() =>
        logJson('info', 'request', {
          requestId: req.requestId,
          method: req.method,
          path: req.originalUrl ?? req.url,
          statusCode: http.getResponse().statusCode,
          durationMs: Date.now() - start,
          userId: req.user?.userId,
        }),
      ),
    );
  }
}
