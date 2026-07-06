import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { MeService } from './me.service';

function makePrismaMock() {
  const tx = {
    telegramUnlock: { update: jest.fn() },
    subscription: { upsert: jest.fn() },
  };
  return {
    user: { findUniqueOrThrow: jest.fn() },
    subscription: { findUnique: jest.fn() },
    telegramUnlock: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn((cb: (txClient: any) => unknown) => cb(tx)),
    __tx: tx,
  };
}

describe('MeService', () => {
  let service: MeService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let credits: { getBalance: jest.Mock };

  beforeEach(async () => {
    prisma = makePrismaMock();
    credits = { getBalance: jest.fn().mockResolvedValue(0) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        MeService,
        { provide: PrismaService, useValue: prisma },
        { provide: CreditsService, useValue: credits },
      ],
    }).compile();
    service = moduleRef.get(MeService);
  });

  it('returns Free plan and live credit balance when the user has no subscription', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      email: 'a@b.com',
      iaUnlimitedUntil: null,
    });
    prisma.subscription.findUnique.mockResolvedValue(null);
    credits.getBalance.mockResolvedValue(3);

    const me = await service.getProfile('u1');

    expect(me).toEqual({
      email: 'a@b.com',
      planKey: 'free',
      planName: 'Livre',
      creditBalance: 3,
      iaUnlimited: false,
      iaUnlimitedUntil: null,
    });
    expect(credits.getBalance).toHaveBeenCalledWith('u1');
  });

  it('reports the Premium plan when the subscription is active within its period', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      email: 'p@b.com',
      iaUnlimitedUntil: null,
    });
    prisma.subscription.findUnique.mockResolvedValue({
      planKey: 'premium',
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    credits.getBalance.mockResolvedValue(12);

    const me = await service.getProfile('u2');

    expect(me).toEqual({
      email: 'p@b.com',
      planKey: 'premium',
      planName: 'Premium',
      creditBalance: 12,
      iaUnlimited: false,
      iaUnlimitedUntil: null,
    });
  });

  it('reports an active unlimited pass with its expiry', async () => {
    const until = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      email: 'u@b.com',
      iaUnlimitedUntil: until,
    });
    prisma.subscription.findUnique.mockResolvedValue(null);

    const me = await service.getProfile('u6');

    expect(me.iaUnlimited).toBe(true);
    expect(me.iaUnlimitedUntil).toBe(until.toISOString());
  });

  it('treats an expired unlimited pass as inactive', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      email: 'ex@b.com',
      iaUnlimitedUntil: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });
    prisma.subscription.findUnique.mockResolvedValue(null);

    const me = await service.getProfile('u7');

    expect(me.iaUnlimited).toBe(false);
  });

  it('treats a premium subscription with no period end as active', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({ email: 'n@b.com' });
    prisma.subscription.findUnique.mockResolvedValue({
      planKey: 'premium',
      status: 'active',
      currentPeriodEnd: null,
    });

    const me = await service.getProfile('u4');

    expect(me.planKey).toBe('premium');
  });

  it('falls back to Free when the premium period has already ended', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({ email: 'e@b.com' });
    prisma.subscription.findUnique.mockResolvedValue({
      planKey: 'premium',
      status: 'active',
      currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    const me = await service.getProfile('u5');

    expect(me.planKey).toBe('free');
    expect(me.planName).toBe('Livre');
  });

  it('falls back to Free when a subscription exists but is not active', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({ email: 'x@b.com' });
    prisma.subscription.findUnique.mockResolvedValue({
      planKey: 'premium',
      status: 'canceled',
      currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const me = await service.getProfile('u3');

    expect(me.planKey).toBe('free');
    expect(me.planName).toBe('Livre');
  });

  it('starts the Telegram unlock timer once for the user', async () => {
    const clickedAt = new Date();
    prisma.telegramUnlock.upsert.mockResolvedValue({
      userId: 'u8',
      clickedAt,
      unlockedAt: null,
    });

    const status = await service.startTelegramUnlock('u8');

    expect(prisma.telegramUnlock.upsert).toHaveBeenCalledWith({
      where: { userId: 'u8' },
      create: { userId: 'u8' },
      update: {},
    });
    expect(status.startedAt).toBe(clickedAt.toISOString());
    expect(status.planKey).toBe('diamante');
    expect(status.eligible).toBe(false);
  });

  it('does not grant Diamante before the Telegram wait is complete', async () => {
    prisma.telegramUnlock.findUnique.mockResolvedValue({
      userId: 'u9',
      clickedAt: new Date(),
      unlockedAt: null,
    });

    const status = await service.claimTelegramUnlock('u9');

    expect(status.eligible).toBe(false);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('grants Diamante after the Telegram wait is complete', async () => {
    prisma.telegramUnlock.findUnique.mockResolvedValue({
      userId: 'u10',
      clickedAt: new Date(Date.now() - 11 * 60 * 1000),
      unlockedAt: null,
    });

    const status = await service.claimTelegramUnlock('u10');

    expect(status.eligible).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.__tx.telegramUnlock.update).toHaveBeenCalledWith({
      where: { userId: 'u10' },
      data: { unlockedAt: expect.any(Date) },
    });
    expect(prisma.__tx.subscription.upsert).toHaveBeenCalledWith({
      where: { userId: 'u10' },
      create: expect.objectContaining({
        userId: 'u10',
        planKey: 'diamante',
        provider: 'telegram-wait',
        currentPeriodEnd: null,
      }),
      update: expect.objectContaining({
        planKey: 'diamante',
        provider: 'telegram-wait',
        currentPeriodEnd: null,
      }),
    });
  });
});
