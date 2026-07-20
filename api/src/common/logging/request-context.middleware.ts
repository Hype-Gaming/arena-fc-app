// api/src/common/logging/request-context.middleware.ts
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Attaches a request id (an incoming `x-request-id`, or a fresh UUID) to the
 * request and echoes it back on the response, so every access/error log line
 * for a request can be correlated — and a client can quote the id when
 * reporting a problem. Runs before guards so even rejected requests carry it.
 */
export function requestContext(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const incoming = req.headers['x-request-id'];
  const requestId =
    (Array.isArray(incoming) ? incoming[0] : incoming) || randomUUID();
  (req as Request & { requestId: string }).requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}
