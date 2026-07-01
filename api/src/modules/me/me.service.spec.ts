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
      planName: 'Free',
      creditBalance: 3,
    });
    expect(credits.getBalance).toHaveBeenCalledWith('u1');
  });

  it('reports the Premium plan when the user has an active premium subscription', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({ email: 'p@b.com' });
    prisma.subscription.findUnique.mockResolvedValue({
      planKey: 'premium',
      status: 'active',
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

  it('falls back to Free when a subscription exists but is not active', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({ email: 'x@b.com' });
    prisma.subscription.findUnique.mockResolvedValue({
      planKey: 'premium',
      status: 'canceled',
    });

    const me = await service.getProfile('u3');

    expect(me.planKey).toBe('free');
    expect(me.planName).toBe('Free');
  });
});
