// api/src/modules/billing/billing.service.ts
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { UsersService } from '../users/users.service';
import { PaymentProviderRegistry } from './adapters/payment-provider.registry';
import { NormalizedWebhook } from './payment-provider.interface';
import { WebhookProcessResult } from './dto/webhook-result.dto';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

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
    query: Record<string, string> = {},
  ): Promise<WebhookProcessResult> {
    const provider = this.registry.get(providerName);

    if (!provider.verifySignature(rawBody, headers, query)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Authentic but undecodable body: ACK with 2xx (so the gateway's "test URL"
    // passes and it doesn't retry a malformed payload in a storm) and log it
    // for investigation, instead of surfacing a 500.
    let event: NormalizedWebhook;
    try {
      event = provider.parse(rawBody);
    } catch (err) {
      this.logger.error(
        `Could not parse ${providerName} webhook: ${(err as Error).message}`,
      );
      return { outcome: 'ignored', reason: `Unparseable ${providerName} body` };
    }

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
      grantCategory: string | null;
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
    if (product.grantType === 'ia_unlimited') {
      await this.grantIaUnlimited(userId, product.grantPeriodDays, tx);
      return;
    }
    if (product.grantType === 'category_access') {
      await this.grantCategoryAccess(userId, product, _event, tx);
      return;
    }
    throw new Error(`Unsupported grantType: ${product.grantType}`);
  }

  /**
   * "Acesso ilimitado" pass: analyses stop consuming credits for a window of
   * grantPeriodDays. We extend User.iaUnlimitedUntil rather than moving credits
   * — buying again while a pass is still active stacks onto the remaining time
   * instead of shrinking it.
   */
  private async grantIaUnlimited(
    userId: string,
    periodDays: number | null,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    if (periodDays == null || periodDays <= 0) {
      throw new Error('ia_unlimited product requires a positive grantPeriodDays');
    }
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { iaUnlimitedUntil: true },
    });
    const now = new Date();
    const base =
      user?.iaUnlimitedUntil && user.iaUnlimitedUntil > now
        ? user.iaUnlimitedUntil
        : now;
    const until = new Date(base.getTime() + periodDays * 24 * 60 * 60 * 1000);
    await tx.user.update({
      where: { id: userId },
      data: { iaUnlimitedUntil: until },
    });
  }

  /**
   * Standalone category product: opens one bilhete category without changing
   * the subscription. A null grantPeriodDays means lifetime access; buying a
   * timed product while active extends from the current expiry.
   */
  private async grantCategoryAccess(
    userId: string,
    product: { grantCategory: string | null; grantPeriodDays: number | null },
    event: NormalizedWebhook,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const categoria = product.grantCategory;
    if (!categoria) {
      throw new Error('category_access product requires grantCategory');
    }

    const existing = await tx.userCategoryAccess.findUnique({
      where: {
        userId_categoria: {
          userId,
          categoria: categoria as never,
        },
      },
      select: { expiresAt: true },
    });

    const periodDays = product.grantPeriodDays;
    const expiresAt =
      periodDays == null
        ? null
        : new Date(
            Math.max(existing?.expiresAt?.getTime() ?? 0, Date.now()) +
              periodDays * 24 * 60 * 60 * 1000,
          );

    await tx.userCategoryAccess.upsert({
      where: {
        userId_categoria: {
          userId,
          categoria: categoria as never,
        },
      },
      create: {
        userId,
        categoria: categoria as never,
        provider: event.provider,
        externalId: event.externalId,
        expiresAt,
      },
      update: {
        provider: event.provider,
        externalId: event.externalId,
        purchasedAt: new Date(),
        expiresAt,
      },
    });
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
