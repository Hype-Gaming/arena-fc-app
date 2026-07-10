import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { GamificationService } from '../gamification/gamification.service';
import { MeService } from './me.service';

function makePrismaMock() {
  return {
    user: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
    subscription: { findUnique: jest.fn() },
  };
}

describe('MeService', () => {
  let service: MeService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let credits: { getBalance: jest.Mock };
  let gamification: { registerDailyLogin: jest.Mock };

  beforeEach(async () => {
    prisma = makePrismaMock();
    credits = { getBalance: jest.fn().mockResolvedValue(0) };
    gamification = {
      registerDailyLogin: jest.fn().mockResolvedValue({
        counted: false,
        currentLoginStreak: 0,
        bestLoginStreak: 0,
      }),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        MeService,
        { provide: PrismaService, useValue: prisma },
        { provide: CreditsService, useValue: credits },
        { provide: GamificationService, useValue: gamification },
      ],
    }).compile();
    service = moduleRef.get(MeService);
  });

  it('returns Free plan and live credit balance when the user has no subscription', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      email: 'a@b.com',
      nickname: null,
      avatarKey: null,
      iaUnlimitedUntil: null,
    });
    prisma.subscription.findUnique.mockResolvedValue(null);
    credits.getBalance.mockResolvedValue(3);

    const me = await service.getProfile('u1');

    expect(me).toEqual({
      email: 'a@b.com',
      nickname: null,
      avatarKey: null,
      planKey: 'free',
      planName: 'Livre',
      creditBalance: 3,
      iaUnlimited: false,
      iaUnlimitedUntil: null,
    });
    expect(credits.getBalance).toHaveBeenCalledWith('u1');
    expect(gamification.registerDailyLogin).toHaveBeenCalledWith('u1');
  });

  it('reports the Premium plan when the subscription is active within its period', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      email: 'p@b.com',
      nickname: 'Craque',
      avatarKey: 'flame',
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
      nickname: 'Craque',
      avatarKey: 'flame',
      planKey: 'premium',
      planName: 'Premium',
      creditBalance: 12,
      iaUnlimited: false,
      iaUnlimitedUntil: null,
    });
  });

  it('updates nickname and avatar, then returns the fresh profile', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      email: 'p@b.com',
      nickname: 'NovoNick',
      avatarKey: 'crown',
      iaUnlimitedUntil: null,
    });
    prisma.subscription.findUnique.mockResolvedValue(null);

    const me = await service.updateProfile('u2', {
      nickname: '  NovoNick  ',
      avatarKey: 'crown',
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u2' },
      data: { nickname: 'NovoNick', avatarKey: 'crown' },
    });
    expect(me.nickname).toBe('NovoNick');
    expect(me.avatarKey).toBe('crown');
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
});
