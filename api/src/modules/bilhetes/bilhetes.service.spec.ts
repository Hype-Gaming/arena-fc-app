// api/src/modules/bilhetes/bilhetes.service.spec.ts
import { BilhetesService } from './bilhetes.service';
import { PrismaService } from '../../prisma/prisma.service';

type SubRow = {
  status: string;
  currentPeriodEnd: Date | null;
  plan: { key: string; rank: number };
} | null;

function makePrisma(sub: SubRow, bilhetes: unknown[], accesses: unknown[] = []) {
  return {
    subscription: { findUnique: jest.fn().mockResolvedValue(sub) },
    userCategoryAccess: { findMany: jest.fn().mockResolvedValue(accesses) },
    bilhete: { findMany: jest.fn().mockResolvedValue(bilhetes) },
  } as unknown as PrismaService;
}

const b = (id: string, categoria: string, odd = 1.5) => ({
  id,
  categoria,
  titulo: 'Bilhete Especial',
  homeTeam: 'A',
  awayTeam: 'B',
  homeColor: null,
  awayColor: null,
  competition: 'Copa',
  startsAt: new Date('2026-07-10T16:00:00Z'),
  odd,
  resultado: 'pending',
  publishedAt: new Date(),
});

describe('BilhetesService.getFeed', () => {
  it('free viewer: counts every category but only receives safes details', async () => {
    const prisma = makePrisma(null, [
      b('1', 'safes'),
      b('2', 'pro'),
      b('3', 'alavancagem'),
    ]);
    const svc = new BilhetesService(prisma);

    const feed = await svc.getFeed('u1');

    expect(feed.plan).toEqual({ key: 'free', rank: 0 });
    const byKey = Object.fromEntries(feed.categorias.map((c) => [c.key, c]));
    expect(byKey.safes).toMatchObject({ count: 1, locked: false });
    expect(byKey.pro).toMatchObject({ count: 1, locked: true });
    expect(byKey.alavancagem).toMatchObject({ count: 1, locked: true });

    expect(feed.bilhetes.map((x) => x.id)).toEqual(['1']);
  });

  it('loads only active published tickets from the Esportiva rail', async () => {
    const prisma = makePrisma(null, [b('1', 'safes')]);
    const svc = new BilhetesService(prisma);

    await svc.getFeed('u1');

    expect(prisma.bilhete.findMany).toHaveBeenCalledWith({
      where: {
        publishedAt: { not: null },
        resultado: 'pending',
        startsAt: { gte: expect.any(Date) },
      },
      orderBy: { startsAt: 'asc' },
    });
  });

  it('premium viewer: unlocks pro/ultra but not the diamante-only markets', async () => {
    const prisma = makePrisma(
      {
        status: 'active',
        currentPeriodEnd: null,
        plan: { key: 'premium', rank: 1 },
      },
      [b('1', 'safes'), b('2', 'pro'), b('3', 'ultra'), b('4', 'multiplas')],
    );
    const svc = new BilhetesService(prisma);

    const feed = await svc.getFeed('u1');

    expect(feed.plan).toEqual({ key: 'premium', rank: 1 });
    expect(feed.bilhetes.map((x) => x.id)).toEqual(['1', '2', '3']);
    const multiplas = feed.categorias.find((c) => c.key === 'multiplas');
    expect(multiplas).toMatchObject({ count: 1, locked: true });
  });

  it('diamante viewer sees everything; expired subscription falls back to free', async () => {
    const diamante = makePrisma(
      {
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 86_400_000),
        plan: { key: 'diamante', rank: 2 },
      },
      [b('1', 'safes'), b('2', 'ligas')],
    );
    const feed = await new BilhetesService(diamante).getFeed('u1');
    expect(feed.bilhetes).toHaveLength(2);
    expect(feed.categorias.every((c) => !c.locked)).toBe(true);

    const expired = makePrisma(
      {
        status: 'active',
        currentPeriodEnd: new Date(Date.now() - 1000),
        plan: { key: 'diamante', rank: 2 },
      },
      [b('2', 'ligas')],
    );
    const feed2 = await new BilhetesService(expired).getFeed('u1');
    expect(feed2.plan).toEqual({ key: 'free', rank: 0 });
    expect(feed2.bilhetes).toHaveLength(0);
  });

  it('free viewer with a category product sees only that purchased category', async () => {
    const prisma = makePrisma(
      null,
      [b('1', 'safes'), b('2', 'pro'), b('3', 'alavancagem'), b('4', 'ligas')],
      [{ categoria: 'alavancagem' }],
    );

    const feed = await new BilhetesService(prisma).getFeed('u1');

    expect(feed.plan).toEqual({ key: 'free', rank: 0 });
    expect(feed.bilhetes.map((x) => x.id)).toEqual(['1', '3']);
    const byKey = Object.fromEntries(feed.categorias.map((c) => [c.key, c]));
    expect(byKey.alavancagem).toMatchObject({ locked: false });
    expect(byKey.ligas).toMatchObject({ locked: true });
  });

  it('exposes the tier label and numeric odd on unlocked tickets', async () => {
    const prisma = makePrisma(null, [b('1', 'safes', 1.53)]);
    const feed = await new BilhetesService(prisma).getFeed('u1');
    expect(feed.bilhetes[0]).toMatchObject({
      tierLabel: 'Básico',
      odd: 1.53,
      titulo: 'Bilhete Especial',
    });
  });
});
