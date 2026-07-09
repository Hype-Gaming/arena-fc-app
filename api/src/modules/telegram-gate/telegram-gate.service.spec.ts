import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import {
  TelegramGateService,
  DEFAULT_TELEGRAM_UNLOCK_WAIT_SECONDS,
} from './telegram-gate.service';

function makePrismaMock() {
  return {
    telegramUnlock: { findUnique: jest.fn(), upsert: jest.fn() },
    subscription: { findUnique: jest.fn() },
  };
}

/** An active paid subscription so the gate applies (most tests need this). */
function paidSubscription() {
  return { status: 'active', currentPeriodEnd: null, planKey: 'premium' };
}

describe('TelegramGateService', () => {
  let service: TelegramGateService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    delete process.env.TELEGRAM_UNLOCK_WAIT_SECONDS;
    prisma = makePrismaMock();
    prisma.subscription.findUnique.mockResolvedValue(paidSubscription());
    const moduleRef = await Test.createTestingModule({
      providers: [
        TelegramGateService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(TelegramGateService);
  });

  it('does not apply to free users (always unlocked, never gated)', async () => {
    prisma.subscription.findUnique.mockResolvedValue(null);

    const state = await service.getState('free-user');

    expect(state.applies).toBe(false);
    expect(state.unlocked).toBe(true);
    expect(prisma.telegramUnlock.findUnique).not.toHaveBeenCalled();
  });

  it('reports not-clicked, locked, full wait when there is no record', async () => {
    prisma.telegramUnlock.findUnique.mockResolvedValue(null);

    const state = await service.getState('u1');

    expect(state).toEqual({
      applies: true,
      clicked: false,
      clickedAt: null,
      unlocked: false,
      waitSeconds: DEFAULT_TELEGRAM_UNLOCK_WAIT_SECONDS,
      remainingSeconds: DEFAULT_TELEGRAM_UNLOCK_WAIT_SECONDS,
    });
  });

  it('stays locked with remaining time while inside the wait window', async () => {
    const clickedAt = new Date(Date.now() - 5 * 60 * 1000); // 5 min ago
    prisma.telegramUnlock.findUnique.mockResolvedValue({ clickedAt });

    const state = await service.getState('u1');

    expect(state.clicked).toBe(true);
    expect(state.unlocked).toBe(false);
    expect(state.remainingSeconds).toBeGreaterThan(290);
    expect(state.remainingSeconds).toBeLessThanOrEqual(300);
  });

  it('unlocks once the wait window has elapsed', async () => {
    const clickedAt = new Date(Date.now() - 11 * 60 * 1000); // 11 min ago
    prisma.telegramUnlock.findUnique.mockResolvedValue({ clickedAt });

    const state = await service.getState('u1');

    expect(state.unlocked).toBe(true);
    expect(state.remainingSeconds).toBe(0);
  });

  it('recordClick upserts without resetting an existing timer', async () => {
    const clickedAt = new Date(Date.now() - 2 * 60 * 1000);
    prisma.telegramUnlock.upsert.mockResolvedValue({ clickedAt });

    const state = await service.recordClick('u1');

    expect(prisma.telegramUnlock.upsert).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      create: { userId: 'u1' },
      update: {},
    });
    expect(state.clicked).toBe(true);
    expect(state.unlocked).toBe(false);
  });

  it('honors a custom wait window from the environment', async () => {
    process.env.TELEGRAM_UNLOCK_WAIT_SECONDS = '30';
    const clickedAt = new Date(Date.now() - 60 * 1000); // 1 min ago > 30s
    prisma.telegramUnlock.findUnique.mockResolvedValue({ clickedAt });

    const state = await service.getState('u1');

    expect(state.waitSeconds).toBe(30);
    expect(state.unlocked).toBe(true);
  });
});
