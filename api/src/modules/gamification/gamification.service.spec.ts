import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GamificationService } from './gamification.service';

function makePrismaMock() {
  // XP is now awarded inside prisma.$transaction(cb) where cb receives a tx
  // client that takes an advisory lock and does the increment + level updates.
  const tx = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    user: { update: jest.fn().mockResolvedValue({ xp: 0 }) },
  };
  return {
    tx,
    $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
    user: {
      findUnique: jest.fn(),
    },
    entradaUnlock: { count: jest.fn().mockResolvedValue(0) },
    entrada: { count: jest.fn().mockResolvedValue(0) },
    achievement: { findMany: jest.fn().mockResolvedValue([]) },
    userAchievement: {
      findMany: jest.fn().mockResolvedValue([]),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
}

describe('GamificationService — XP & levels', () => {
  let service: GamificationService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [
        GamificationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(GamificationService);
  });

  it('atomically increments XP and persists the recomputed level', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', xp: 95, level: 1 });
    // The atomic increment returns the true post-increment xp (95 + 10).
    prisma.tx.user.update.mockResolvedValue({ xp: 105 });

    const result = await service.handleEvent({
      eventName: 'entrada.unlocked', // +10 xp
      userId: 'u1',
      entradaId: 'e1',
    });

    // 1st tx write: atomic in-place increment (no read-then-write).
    expect(prisma.tx.user.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'u1' },
      data: { xp: { increment: 10 } },
      select: { xp: true },
    });
    // 2nd tx write: level derived from the atomic result (105 -> level 2).
    expect(prisma.tx.user.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'u1' },
      data: { level: 2 },
    });
    // Serialized under a per-user advisory lock.
    expect(prisma.tx.$executeRaw).toHaveBeenCalled();
    expect(result.xp).toBe(105);
    expect(result.level).toBe(2);
    expect(result.xpAwarded).toBe(10);
  });

  it('does not write when the event grants 0 xp and unlocks nothing', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', xp: 10, level: 1 });

    const result = await service.handleEvent({
      eventName: 'unknown.event' as any,
      userId: 'u1',
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.tx.user.update).not.toHaveBeenCalled();
    expect(result.xpAwarded).toBe(0);
  });

  it('throws when the user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.handleEvent({ eventName: 'daily.login', userId: 'ghost' }),
    ).rejects.toThrow('User ghost not found');
  });

  it('silently ignores a stale async event when the user was deleted', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', xp: 0, level: 1 });
    prisma.tx.user.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record to update not found', {
        code: 'P2025',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.onDomainEvent({
        eventName: 'entrada.unlocked',
        userId: 'u1',
        entradaId: 'e1',
      }),
    ).resolves.toBeUndefined();
  });
});

describe('GamificationService — achievement unlocking', () => {
  let service: GamificationService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [
        GamificationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(GamificationService);
  });

  it('unlocks first_unlock when the user reaches 1 unlock', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', xp: 0, level: 1 });
    prisma.tx.user.update.mockResolvedValue({ xp: 10 });
    prisma.entradaUnlock.count.mockResolvedValue(1);
    prisma.entrada.count.mockResolvedValue(0);
    prisma.achievement.findMany.mockResolvedValue([
      { key: 'first_unlock', criteria: { type: 'unlock_count', threshold: 1 } },
      { key: 'ten_unlocks', criteria: { type: 'unlock_count', threshold: 10 } },
    ]);
    prisma.userAchievement.findMany.mockResolvedValue([]); // none yet
    prisma.userAchievement.createMany.mockResolvedValue({ count: 1 });

    const result = await service.handleEvent({
      eventName: 'entrada.unlocked',
      userId: 'u1',
      entradaId: 'e1',
    });

    expect(prisma.userAchievement.createMany).toHaveBeenCalledWith({
      data: [{ userId: 'u1', achievementKey: 'first_unlock', progress: 1 }],
      skipDuplicates: true,
    });
    expect(result.newAchievementKeys).toEqual(['first_unlock']);
  });

  it('does not re-unlock an achievement the user already has', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', xp: 0, level: 1 });
    prisma.tx.user.update.mockResolvedValue({ xp: 10 });
    prisma.entradaUnlock.count.mockResolvedValue(1);
    prisma.achievement.findMany.mockResolvedValue([
      { key: 'first_unlock', criteria: { type: 'unlock_count', threshold: 1 } },
    ]);
    prisma.userAchievement.findMany.mockResolvedValue([
      { achievementKey: 'first_unlock' },
    ]);

    const result = await service.handleEvent({
      eventName: 'entrada.unlocked',
      userId: 'u1',
      entradaId: 'e1',
    });

    expect(prisma.userAchievement.createMany).not.toHaveBeenCalled();
    expect(result.newAchievementKeys).toEqual([]);
  });

  it('unlocks level_5 by criteria when the recomputed level qualifies', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', xp: 980, level: 4 });
    prisma.tx.user.update.mockResolvedValue({ xp: 1005 });
    prisma.achievement.findMany.mockResolvedValue([
      { key: 'level_5', criteria: { type: 'level_reached', threshold: 5 } },
    ]);
    prisma.userAchievement.findMany.mockResolvedValue([]);
    prisma.userAchievement.createMany.mockResolvedValue({ count: 1 });

    const result = await service.handleEvent({
      eventName: 'entrada.green', // +25 xp -> 1005 -> level 5
      userId: 'u1',
      entradaId: 'e1',
    });

    expect(result.level).toBe(5);
    expect(result.newAchievementKeys).toEqual(['level_5']);
  });
});

describe('GamificationService — profile read', () => {
  let service: GamificationService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [
        GamificationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(GamificationService);
  });

  it('returns xp, level, next-level progress and achievements', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', xp: 120, level: 2 });
    prisma.achievement.findMany.mockResolvedValue([
      { key: 'first_unlock', name: 'Primeira Entrada', description: 'd', icon: 'i', criteria: { type: 'unlock_count', threshold: 1 } },
      { key: 'ten_unlocks', name: 'Caçador de Tips', description: 'd', icon: 'i', criteria: { type: 'unlock_count', threshold: 10 } },
    ]);
    prisma.userAchievement.findMany.mockResolvedValue([
      { achievementKey: 'first_unlock', unlockedAt: new Date('2026-06-01T00:00:00Z'), progress: 1 },
    ]);

    const dto = await service.getProfileGamification('u1');

    expect(dto.xp).toBe(120);
    expect(dto.level).toBe(2);
    expect(dto.currentLevelFloor).toBe(100); // threshold for level 2
    expect(dto.nextLevelXp).toBe(250); // threshold for level 3
    expect(dto.achievements).toHaveLength(2);
    const first = dto.achievements.find((a) => a.key === 'first_unlock')!;
    expect(first.unlocked).toBe(true);
    const ten = dto.achievements.find((a) => a.key === 'ten_unlocks')!;
    expect(ten.unlocked).toBe(false);
  });

  it('throws NotFound for an unknown user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.getProfileGamification('ghost')).rejects.toThrow(
      'User ghost not found',
    );
  });
});
