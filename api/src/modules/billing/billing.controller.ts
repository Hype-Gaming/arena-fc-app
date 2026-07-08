// api/src/modules/billing/billing.controller.ts
import { Controller, Param, Post, Req } from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { WebhookProcessResult } from './dto/webhook-result.dto';

@Controller('webhooks')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Post(':provider')
  async handle(
    @Param('provider') provider: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<WebhookProcessResult> {
    const rawBody = req.rawBody ?? Buffer.alloc(0);
    const headers = (req.headers ?? {}) as Record<string, string>;
    const query = flattenQuery(req.query);

    return this.billing.processWebhook(provider, rawBody, headers, query);
  }
}

/** Express query values can be string | string[] | nested — flatten to strings. */
function flattenQuery(query: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (query && typeof query === 'object') {
    for (const [k, v] of Object.entries(query as Record<string, unknown>)) {
      if (typeof v === 'string') out[k] = v;
      else if (Array.isArray(v) && typeof v[0] === 'string') out[k] = v[0];
    }
  }
  return out;
}
