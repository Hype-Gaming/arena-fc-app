// api/src/modules/billing/billing.service.spec.ts
import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BillingService } from './billing.service';
import { PaymentProviderRegistry } from './adapters/payment-provider.registry';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { UsersService } from '../users/users.service';

const adapter = {
  name: 'lastlink' as const,
  verifySignature: jest.fn(),
  parse: jest.fn(),
};

const norm = {
  provider: 'lastlink' as const,
  externalId: 'll_evt_42',
  type: 'Purchase',
  buyerEmail: 'buyer@example.com',
  externalProductId: 'prod_credits_100',
  raw: { Id: 'll_evt_42' },
};

function makeModule(overrides: {
  webhookFindUnique?: jest.Mock;
  webhookCreate?: jest.Mock;
  productFindFirst?: jest.Mock;
  applyTransaction?: jest.Mock;
  findOrCreateByEmail?: jest.Mock;
  planFindUnique?: jest.Mock;
  subscriptionUpsert?: jest.Mock;
}) {
  const webhookCreate =
    overrides.webhookCreate ??
    jest.fn().mockResolvedValue({ id: 'wh_1', externalId: norm.externalId });
  const productFindFirst = overrides.productFindFirst ?? jest.fn();
  const planFindUnique =
    overrides.planFindUnique ??
    jest.fn().mockResolvedValue({ key: 'premium', monthlyCredits: 50 });
  const subscriptionUpsert =
    overrides.subscriptionUpsert ?? jest.fn().mockResolvedValue({ id: 'sub_1' });

  // The interactive transaction client passed to the callback. It exposes the
  // same models the tx body touches: webhookEvent.create + subscription.upsert.
  const txClient = {
    webhookEvent: { create: webhookCreate },
    subscription: { upsert: subscriptionUpsert },
  };

  const prisma = {
    webhookEvent: {
      findUnique: overrides.webhookFindUnique ?? jest.fn().mockResolvedValue(null),
      // Standalone create (used only for the "ignored" path, outside a tx).
      create: webhookCreate,
    },
    product: {
      findFirst: productFindFirst,
    },
    plan: { findUnique: planFindUnique },
    // Run the callback with the tx client so record+grant share one tx. If the
    // callback rejects, the promise rejects (mirroring a rollback).
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(txClient)),
  };
  const credits = {
    applyTransaction:
      overrides.applyTransaction ?? jest.fn().mockResolvedValue({ balanceAfter: 100 }),
  };
  const users = {
    findOrCreateByEmail:
      overrides.findOrCreateByEmail ?? jest.fn().mockResolvedValue({ id: 'user_1' }),
  };
  const registry = { get: jest.fn().mockReturnValue(adapter) };

  return Test.createTestingModule({
    providers: [
      BillingService,
      { provide: PrismaService, useValue: prisma },
      { provide: CreditsService, useValue: credits },
      { provide: UsersService, useValue: users },
      { provide: PaymentProviderRegistry, useValue: registry },
    ],
  })
    .compile()
    .then((m) => ({
      service: m.get(BillingService),
      prisma,
      credits,
      users,
      registry,
      webhookCreate,
      subscriptionUpsert,
      txClient,
    }));
}

function p2002OnExternalId(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target: ['externalId'] },
  });
}

describe('BillingService.processWebhook', () => {
  beforeEach(() => {
    adapter.verifySignature.mockReset().mockReturnValue(true);
    adapter.parse.mockReset().mockReturnValue(norm);
  });

  it('throws Unauthorized when signature is invalid', async () => {
    adapter.verifySignature.mockReturnValue(false);
    const { service } = await makeModule({});
    await expect(
      service.processWebhook('lastlink', Buffer.from('{}'), {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns duplicate and does no grant when event already processed', async () => {
    const { service, credits } = await makeModule({
      webhookFindUnique: jest
        .fn()
        .mockResolvedValue({ id: 'wh_old', externalId: norm.externalId, processedAt: new Date() }),
    });
    const result = await service.processWebhook('lastlink', Buffer.from('{}'), {});
    expect(result.outcome).toBe('duplicate');
    expect(credits.applyTransaction).not.toHaveBeenCalled();
  });

  it('ignores when no active product matches provider+externalProductId', async () => {
    const { service, credits, prisma } = await makeModule({
      productFindFirst: jest.fn().mockResolvedValue(null),
    });
    const result = await service.processWebhook('lastlink', Buffer.from('{}'), {});
    expect(result.outcome).toBe('ignored');
    expect(result.reason).toMatch(/product/i);
    expect(credits.applyTransaction).not.toHaveBeenCalled();
    expect(prisma.webhookEvent.create).toHaveBeenCalled(); // still recorded for dedupe
  });

  it('grants credits via CreditsService for a credits product', async () => {
    const { service, credits, users, prisma, txClient } = await makeModule({
      productFindFirst: jest.fn().mockResolvedValue({
        id: 'p1',
        provider: 'lastlink',
        externalProductId: norm.externalProductId,
        grantType: 'credits',
        grantCredits: 100,
        grantPlanKey: null,
        active: true,
      }),
    });

    const result = await service.processWebhook('lastlink', Buffer.from('{}'), {});

    expect(users.findOrCreateByEmail).toHaveBeenCalledWith('buyer@example.com');
    // MONEY: credits move via applyTransaction, and the tx client is passed as
    // the 2nd positional arg so record+grant are atomic.
    expect(credits.applyTransaction).toHaveBeenCalledWith(
      {
        userId: 'user_1',
        type: 'purchase',
        amount: 100,
        refType: 'webhook',
        refId: 'wh_1',
      },
      txClient,
    );
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.webhookEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          provider: 'lastlink',
          externalId: norm.externalId,
          type: norm.type,
        }),
      }),
    );
    expect(result.outcome).toBe('processed');
    expect(result.eventId).toBe('wh_1');
  });

  it('rolls back the WebhookEvent.create when the grant fails (atomic record+grant)', async () => {
    // The tx client tracks whether create was "committed". Because create+grant
    // run in ONE $transaction, a grant failure must reject the whole callback so
    // the create never persists — closing the lost-grant window.
    let createCommitted = false;
    const webhookCreate = jest.fn().mockImplementation(async () => {
      createCommitted = true; // provisional insert inside the tx
      return { id: 'wh_1', externalId: norm.externalId };
    });
    const applyTransaction = jest
      .fn()
      .mockRejectedValue(new Error('grant boom (e.g. process crash)'));

    const { service, prisma } = await makeModule({
      webhookCreate,
      applyTransaction,
      productFindFirst: jest.fn().mockResolvedValue({
        id: 'p1',
        provider: 'lastlink',
        externalProductId: norm.externalProductId,
        grantType: 'credits',
        grantCredits: 100,
        grantPlanKey: null,
        active: true,
      }),
    });

    // Make $transaction model rollback: if the callback rejects, discard the
    // provisional create side effect (createCommitted -> false), then rethrow.
    prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => {
      try {
        return await cb((prisma as any).__txClient ?? {
          webhookEvent: { create: webhookCreate },
          subscription: { upsert: jest.fn() },
        });
      } catch (err) {
        createCommitted = false; // ROLLBACK: the WebhookEvent row is discarded
        throw err;
      }
    });

    await expect(
      service.processWebhook('lastlink', Buffer.from('{}'), {}),
    ).rejects.toThrow(/grant boom/);

    // create WAS attempted inside the tx, but the tx rolled back -> no persisted row.
    expect(webhookCreate).toHaveBeenCalled();
    expect(createCommitted).toBe(false);
  });

  it('returns duplicate (not a 500) when WebhookEvent.create hits P2002 (concurrent replay loser)', async () => {
    const webhookCreate = jest.fn().mockRejectedValue(p2002OnExternalId());
    const applyTransaction = jest.fn();

    const { service, credits } = await makeModule({
      webhookCreate,
      applyTransaction,
      productFindFirst: jest.fn().mockResolvedValue({
        id: 'p1',
        provider: 'lastlink',
        externalProductId: norm.externalProductId,
        grantType: 'credits',
        grantCredits: 100,
        grantPlanKey: null,
        active: true,
      }),
    });

    const result = await service.processWebhook('lastlink', Buffer.from('{}'), {});

    expect(result.outcome).toBe('duplicate');
    expect(credits.applyTransaction).not.toHaveBeenCalled();
  });
});

describe('BillingService plan grant', () => {
  beforeEach(() => {
    adapter.verifySignature.mockReset().mockReturnValue(true);
    adapter.parse
      .mockReset()
      .mockReturnValue({ ...norm, externalProductId: 'prod_premium' });
  });

  it('activates/renews subscription and grants monthlyCredits', async () => {
    const subscriptionUpsert = jest.fn().mockResolvedValue({ id: 'sub_1' });
    const planFindUnique = jest
      .fn()
      .mockResolvedValue({ key: 'premium', monthlyCredits: 50 });

    const { service, credits, users, txClient } = await makeModule({
      planFindUnique,
      subscriptionUpsert,
      productFindFirst: jest.fn().mockResolvedValue({
        id: 'p2',
        provider: 'lastlink',
        externalProductId: 'prod_premium',
        grantType: 'plan',
        grantCredits: null,
        grantPlanKey: 'premium',
        active: true,
      }),
    });

    const result = await service.processWebhook('lastlink', Buffer.from('{}'), {});

    expect(users.findOrCreateByEmail).toHaveBeenCalledWith('buyer@example.com');
    expect(subscriptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user_1' },
        create: expect.objectContaining({
          userId: 'user_1',
          planKey: 'premium',
          status: 'active',
          provider: 'lastlink',
          externalId: norm.externalId,
        }),
        update: expect.objectContaining({ planKey: 'premium', status: 'active' }),
      }),
    );
    expect(credits.applyTransaction).toHaveBeenCalledWith(
      {
        userId: 'user_1',
        type: 'grant',
        amount: 50,
        refType: 'subscription',
        refId: 'sub_1',
      },
      txClient,
    );
    expect(result.outcome).toBe('processed');
  });
});
