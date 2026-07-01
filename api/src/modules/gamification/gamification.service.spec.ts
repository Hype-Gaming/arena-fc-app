import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { GamificationService } from './gamification.service';

function makePrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
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

  it('adds the event XP to the user and persists new xp+level', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', xp: 95, level: 1 });
    prisma.user.update.mockResolvedValue({ id: 'u1', xp: 105, level: 2 });

    const result = await service.handleEvent({
      eventName: 'entrada.unlocked', // +10 xp
      userId: 'u1',
      entradaId: 'e1',
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { xp: 105, level: 2 },
      select: { id: true, xp: true, level: true },
    });
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

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(result.xpAwarded).toBe(0);
  });

  it('throws when the user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.handleEvent({ eventName: 'daily.login', userId: 'ghost' }),
    ).rejects.toThrow('User ghost not found');
  });
});
