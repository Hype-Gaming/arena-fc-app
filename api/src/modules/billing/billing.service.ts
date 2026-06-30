// api/src/modules/billing/billing.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { UsersService } from '../users/users.service';
import { PaymentProviderRegistry } from './adapters/payment-provider.registry';
import { NormalizedWebhook } from './payment-provider.interface';
import { WebhookProcessResult } from './dto/webhook-result.dto';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: PaymentProviderRegistry,
    private readonly credits: CreditsService,
    private readonly users: UsersService,
  ) {}

  async processWebhook(
    providerName: string,
    rawBody: Buffer,
    headers: Record<string, string>,
  ): Promise<WebhookProcessResult> {
    const provider = this.registry.get(providerName);

    if (!provider.verifySignature(rawBody, headers)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const event = provider.parse(rawBody);

    // Dedupe: gateways resend. externalId is unique in WebhookEvent.
    const existing = await this.prisma.webhookEvent.findUnique({
      where: { externalId: event.externalId },
    });
    if (existing) {
      return { outcome: 'duplicate', eventId: existing.id };
    }

    // Record the event first so the grant can reference it (refId) and so
    // a crash mid-grant still leaves a dedupe marker.
    const record = await this.prisma.webhookEvent.create({
      data: {
        provider: event.provider,
        externalId: event.externalId,
        type: event.type,
        payload: event.raw as object,
        processedAt: new Date(),
      },
    });

    const product = await this.prisma.product.findFirst({
      where: {
        provider: event.provider,
        externalProductId: event.externalProductId,
        active: true,
      },
    });
    if (!product) {
      return {
        outcome: 'ignored',
        eventId: record.id,
        reason: `No active product for ${event.provider}/${event.externalProductId}`,
      };
    }

    const user = await this.users.findOrCreateByEmail(event.buyerEmail);

    await this.applyGrant(user.id, product, record.id, event);

    return { outcome: 'processed', eventId: record.id };
  }

  private async applyGrant(
    userId: string,
    product: {
      grantType: string;
      grantCredits: number | null;
      grantPlanKey: string | null;
    },
    eventId: string,
    _event: NormalizedWebhook,
  ): Promise<void> {
    if (product.grantType === 'credits') {
      await this.credits.applyTransaction({
        userId,
        type: 'purchase',
        amount: product.grantCredits ?? 0,
        refType: 'webhook',
        refId: eventId,
      });
      return;
    }
    if (product.grantType === 'plan') {
      await this.grantPlan(userId, product.grantPlanKey ?? '', _event);
      return;
    }
    throw new Error(`Unsupported grantType: ${product.grantType}`);
  }

  private async grantPlan(
    userId: string,
    planKey: string,
    event: NormalizedWebhook,
  ): Promise<void> {
    const plan = await this.prisma.plan.findUnique({
      where: { key: planKey as never },
    });
    if (!plan) {
      throw new Error(`Plan not found: ${planKey}`);
    }

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const subscription = await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        planKey: planKey as never,
        status: 'active',
        provider: event.provider,
        externalId: event.externalId,
        currentPeriodEnd: periodEnd,
      },
      update: {
        planKey: planKey as never,
        status: 'active',
        provider: event.provider,
        externalId: event.externalId,
        currentPeriodEnd: periodEnd,
      },
    });

    if (plan.monthlyCredits > 0) {
      await this.credits.applyTransaction({
        userId,
        type: 'grant',
        amount: plan.monthlyCredits,
        refType: 'subscription',
        refId: subscription.id,
      });
    }
  }
}
