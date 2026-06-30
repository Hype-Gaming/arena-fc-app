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
    return this.billing.processWebhook(provider, rawBody, headers);
  }
}
