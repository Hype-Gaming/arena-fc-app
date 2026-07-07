// api/src/modules/billing/billing.controller.ts
import { Controller, Logger, Param, Post, Req } from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { WebhookProcessResult } from './dto/webhook-result.dto';

@Controller('webhooks')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(private readonly billing: BillingService) {}

  @Post(':provider')
  async handle(
    @Param('provider') provider: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<WebhookProcessResult> {
    const rawBody = req.rawBody ?? Buffer.alloc(0);
    const headers = (req.headers ?? {}) as Record<string, string>;
    const query = flattenQuery(req.query);

    // TEMPORARY (Payt wiring): dump the real postback so we can map its fields
    // and confirm how the token arrives. Remove once the adapter is verified.
    if (provider === 'payt') {
      this.logger.log(
        `payt postback · ct=${headers['content-type'] ?? '-'} · query=${JSON.stringify(query)} · body=${rawBody.toString('utf8').slice(0, 4000)}`,
      );
    }

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
