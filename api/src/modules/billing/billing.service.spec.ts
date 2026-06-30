// api/src/modules/billing/billing.service.spec.ts
import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
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
}) {
  const prisma = {
    webhookEvent: {
      findUnique: overrides.webhookFindUnique ?? jest.fn().mockResolvedValue(null),
      create:
        overrides.webhookCreate ??
        jest.fn().mockResolvedValue({ id: 'wh_1', externalId: norm.externalId }),
    },
    product: {
      findFirst: overrides.productFindFirst ?? jest.fn(),
    },
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
    }));
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
    const { service, credits, users, prisma } = await makeModule({
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
    expect(credits.applyTransaction).toHaveBeenCalledWith({
      userId: 'user_1',
      type: 'purchase',
      amount: 100,
      refType: 'webhook',
      refId: 'wh_1',
    });
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
});
