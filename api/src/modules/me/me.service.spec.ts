import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { MeService } from './me.service';

function makePrismaMock() {
  return {
    user: { findUniqueOrThrow: jest.fn() },
    subscription: { findUnique: jest.fn() },
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
    prisma.user.findUniqueOrThrow.mockResolvedValue({ email: 'a@b.com' });
    prisma.subscription.findUnique.mockResolvedValue(null);
    credits.getBalance.mockResolvedValue(3);

    const me = await service.getProfile('u1');

    expect(me).toEqual({
      email: 'a@b.com',
      planKey: 'free',
      planName: 'Livre',
      creditBalance: 3,
    });
    expect(credits.getBalance).toHaveBeenCalledWith('u1');
  });

  it('reports the Premium plan when the subscription is active within its period', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({ email: 'p@b.com' });
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
    });
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
});
