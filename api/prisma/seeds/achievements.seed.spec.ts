import { ACHIEVEMENT_SEEDS, seedAchievements } from './achievements.seed';

type UpsertCall = { where: any; create: any; update: any };

function makePrismaMock() {
  const calls: UpsertCall[] = [];
  return {
    calls,
    achievement: {
      upsert: jest.fn((args: UpsertCall) => {
        calls.push(args);
        return Promise.resolve({ key: args.where.key });
      }),
    },
  };
}

describe('achievements.seed', () => {
  it('defines the spec milestone achievements with criteria', () => {
    const keys = ACHIEVEMENT_SEEDS.map((a) => a.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        'first_unlock',
        'ten_unlocks',
        'first_green',
        'level_5',
        'first_referral',
      ]),
    );
    const firstUnlock = ACHIEVEMENT_SEEDS.find((a) => a.key === 'first_unlock')!;
    expect(firstUnlock.criteria).toEqual({ type: 'unlock_count', threshold: 1 });
    expect(firstUnlock.name).toBeTruthy();
    expect(firstUnlock.description).toBeTruthy();
    expect(firstUnlock.icon).toBeTruthy();
  });

  it('every seed has a unique key', () => {
    const keys = ACHIEVEMENT_SEEDS.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('every criteria has a supported type', () => {
    const supported = ['unlock_count', 'green_count', 'level_reached', 'referral_count'];
    for (const a of ACHIEVEMENT_SEEDS) {
      expect(supported).toContain((a.criteria as any).type);
    }
  });

  it('upserts each achievement by key (idempotent)', async () => {
    const prisma = makePrismaMock();
    await seedAchievements(prisma as any);
    expect(prisma.achievement.upsert).toHaveBeenCalledTimes(ACHIEVEMENT_SEEDS.length);
    const firstCall = prisma.calls[0];
    expect(firstCall.where).toHaveProperty('key');
    expect(firstCall.create).toHaveProperty('key');
    expect(firstCall.update).toHaveProperty('name');
  });
});
