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

    // TEMPORARY (Payt wiring): the field shape is confirmed, but we still need
    // the real `product.code` of each plan to seed it. Log ONLY the product
    // identity + status (no PII — no name/email/doc/address) so a real sale
    // reveals the code. Remove once both plan products are seeded & verified.
    if (provider === 'payt') {
      const body = safeJson(rawBody);
      this.logger.log(
        `payt postback · status=${body?.status ?? '-'} · tx=${body?.transaction_id ?? '-'} · product.code=${body?.product?.code ?? '-'} · product.name=${body?.product?.name ?? '-'} · test=${body?.test ?? '-'}`,
      );
    }

    return this.billing.processWebhook(provider, rawBody, headers, query);
  }
}

/** Best-effort JSON parse for the temporary Payt product-identity log. */
function safeJson(raw: Buffer): any {
  try {
    return JSON.parse(raw.toString('utf8'));
  } catch {
    return null;
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
