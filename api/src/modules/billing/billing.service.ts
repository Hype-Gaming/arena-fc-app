// api/src/modules/billing/billing.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

    // Product resolution and user upsert are idempotent reads/upserts, so they
    // stay OUTSIDE the money transaction.
    const product = await this.prisma.product.findFirst({
      where: {
        provider: event.provider,
        externalProductId: event.externalProductId,
        active: true,
      },
    });
    if (!product) {
      // No grant to make: record a standalone dedupe marker and stop.
      const record = await this.prisma.webhookEvent.create({
        data: {
          provider: event.provider,
          externalId: event.externalId,
          type: event.type,
          payload: event.raw as object,
          processedAt: new Date(),
        },
      });
      return {
        outcome: 'ignored',
        eventId: record.id,
        reason: `No active product for ${event.provider}/${event.externalProductId}`,
      };
    }

    const user = await this.users.findOrCreateByEmail(event.buyerEmail);

    try {
      // Atomic: record the event AND perform the grant in ONE transaction. If
      // the grant fails (or the process crashes mid-way), the WebhookEvent
      // insert rolls back too, so a retry can succeed — no lost grant, and no
      // dedupe marker left without its credits.
      const eventId = await this.prisma.$transaction(async (tx) => {
        const record = await tx.webhookEvent.create({
          data: {
            provider: event.provider,
            externalId: event.externalId,
            type: event.type,
            payload: event.raw as object,
            processedAt: new Date(),
          },
        });

        await this.applyGrant(user.id, product, record.id, event, tx);
        return record.id;
      });

      return { outcome: 'processed', eventId };
    } catch (err) {
      // Concurrent replay: the loser hits a P2002 unique violation on
      // WebhookEvent.externalId. Treat it as a graceful duplicate (2xx) instead
      // of surfacing a 500 that gateways would keep retrying.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return { outcome: 'duplicate' };
      }
      throw err;
    }
  }

  private async applyGrant(
    userId: string,
    product: {
      grantType: string;
      grantCredits: number | null;
      grantPlanKey: string | null;
      grantPeriodDays: number | null;
    },
    eventId: string,
    _event: NormalizedWebhook,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    if (product.grantType === 'credits') {
      await this.credits.applyTransaction(
        {
          userId,
          type: 'purchase',
          amount: product.grantCredits ?? 0,
          refType: 'webhook',
          refId: eventId,
        },
        tx,
      );
      return;
    }
    if (product.grantType === 'plan') {
      await this.grantPlan(userId, product, _event, tx);
      return;
    }
    throw new Error(`Unsupported grantType: ${product.grantType}`);
  }

  private async grantPlan(
    userId: string,
    product: { grantPlanKey: string | null; grantPeriodDays: number | null },
    event: NormalizedWebhook,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const planKey = product.grantPlanKey ?? '';
    const plan = await this.prisma.plan.findUnique({
      where: { key: planKey as never },
    });
    if (!plan) {
      throw new Error(`Plan not found: ${planKey}`);
    }

    // null grantPeriodDays = lifetime product ("VIDA"): no expiry is tracked,
    // and MeService/BilhetesService treat a null currentPeriodEnd as always
    // active. `== null` also covers undefined from partial mocks/rows.
    const periodDays = product.grantPeriodDays;
    const periodEnd =
      periodDays == null
        ? null
        : new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000);

    const subscription = await tx.subscription.upsert({
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
      await this.credits.applyTransaction(
        {
          userId,
          type: 'grant',
          amount: plan.monthlyCredits,
          refType: 'subscription',
          refId: subscription.id,
        },
        tx,
      );
    }
  }
}
