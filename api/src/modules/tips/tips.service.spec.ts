import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TipsService } from './tips.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { EntradaNotFoundError } from './tips.errors';
import { CategoryNotFoundError, MatchNotFoundError } from './tips.errors';

describe('TipsService.getFeed', () => {
  let service: TipsService;
  let prisma: {
    category: { findMany: jest.Mock };
    entradaUnlock: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      category: { findMany: jest.fn() },
      entradaUnlock: { findMany: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        TipsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CreditsService, useValue: { applyTransaction: jest.fn(), getBalance: jest.fn() } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();
    service = moduleRef.get(TipsService);
  });

  it('returns categories with matches and entradas, hiding justification when locked', async () => {
    prisma.category.findMany.mockResolvedValue([
      {
        id: 'cat1',
        name: 'Futebol',
        slug: 'futebol',
        icon: 'soccer',
        matches: [
          {
            id: 'm1',
            homeTeam: 'A',
            awayTeam: 'B',
            competition: 'Liga',
            startsAt: new Date('2026-07-01T20:00:00Z'),
            status: 'scheduled',
            entradas: [
              {
                id: 'e1',
                market: '1X2',
                selection: 'Casa',
                odd: 1.85,
                justification: 'segredo',
                costInCredits: 10,
                status: 'pending',
                publishedAt: new Date('2026-06-30T10:00:00Z'),
              },
              {
                id: 'e2',
                market: 'Over',
                selection: '2.5',
                odd: 2.1,
                justification: 'visivel',
                costInCredits: 5,
                status: 'green',
                publishedAt: new Date('2026-06-30T10:00:00Z'),
              },
            ],
          },
        ],
      },
    ]);
    // user already unlocked e2
    prisma.entradaUnlock.findMany.mockResolvedValue([{ entradaId: 'e2' }]);

    const feed = await service.getFeed('user1');

    const e1 = feed.categories[0].matches[0].entradas[0];
    const e2 = feed.categories[0].matches[0].entradas[1];
    expect(e1.locked).toBe(true);
    expect(e1.justification).toBeNull();
    expect(e1.market).toBe('1X2');
    expect(e1.costInCredits).toBe(10);
    expect(e2.locked).toBe(false);
    expect(e2.justification).toBe('visivel');
    expect(prisma.entradaUnlock.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1' },
      select: { entradaId: true },
    });
  });
});

describe('TipsService.unlockEntrada', () => {
  let service: TipsService;
  let prisma: any;
  let credits: { applyTransaction: jest.Mock };
  let events: { emit: jest.Mock };
  let txClient: any;

  beforeEach(async () => {
    txClient = {
      entradaUnlock: { findUnique: jest.fn(), create: jest.fn() },
    };
    prisma = {
      entrada: { findUnique: jest.fn() },
      $transaction: jest.fn((cb: any) => cb(txClient)),
    };
    credits = { applyTransaction: jest.fn() };
    events = { emit: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        TipsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CreditsService, useValue: credits },
        { provide: EventEmitter2, useValue: events },
      ],
    }).compile();
    service = moduleRef.get(TipsService);
  });

  const entrada = {
    id: 'e1',
    market: '1X2',
    selection: 'Casa',
    odd: 1.85,
    justification: 'porque sim',
    costInCredits: 10,
    status: 'pending',
  };

  it('debits credits via CreditsService, creates unlock, returns justification', async () => {
    prisma.entrada.findUnique.mockResolvedValue(entrada);
    txClient.entradaUnlock.findUnique.mockResolvedValue(null);
    txClient.entradaUnlock.create.mockResolvedValue({ entradaId: 'e1', userId: 'u1' });

    const res = await service.unlockEntrada('u1', 'e1');

    expect(credits.applyTransaction).toHaveBeenCalledWith(
      { userId: 'u1', type: 'unlock', amount: -10, refType: 'entrada', refId: 'e1' },
      txClient,
    );
    expect(txClient.entradaUnlock.create).toHaveBeenCalledWith({
      data: { userId: 'u1', entradaId: 'e1' },
    });
    expect(res.alreadyUnlocked).toBe(false);
    expect(res.justification).toBe('porque sim');
    expect(res.entrada.id).toBe('e1');
    // A new unlock drives gamification (XP + achievements).
    expect(events.emit).toHaveBeenCalledWith('entrada.unlocked', {
      eventName: 'entrada.unlocked',
      userId: 'u1',
      entradaId: 'e1',
    });
  });

  it('is idempotent: if already unlocked, does not charge again', async () => {
    prisma.entrada.findUnique.mockResolvedValue(entrada);
    txClient.entradaUnlock.findUnique.mockResolvedValue({ entradaId: 'e1', userId: 'u1' });

    const res = await service.unlockEntrada('u1', 'e1');

    expect(credits.applyTransaction).not.toHaveBeenCalled();
    expect(txClient.entradaUnlock.create).not.toHaveBeenCalled();
    expect(res.alreadyUnlocked).toBe(true);
    expect(res.justification).toBe('porque sim');
    // No XP for a repeat unlock.
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('throws EntradaNotFoundError when entrada does not exist', async () => {
    prisma.entrada.findUnique.mockResolvedValue(null);
    await expect(service.unlockEntrada('u1', 'nope')).rejects.toBeInstanceOf(
      EntradaNotFoundError,
    );
    expect(credits.applyTransaction).not.toHaveBeenCalled();
  });
});

describe('TipsService read endpoints', () => {
  let service: TipsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      category: { findMany: jest.fn() },
      match: { findMany: jest.fn(), findUnique: jest.fn() },
      category2: undefined,
    };
    prisma.category.findUnique = jest.fn();
    const moduleRef = await Test.createTestingModule({
      providers: [
        TipsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CreditsService, useValue: { applyTransaction: jest.fn() } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();
    service = moduleRef.get(TipsService);
  });

  it('listCategories returns all categories ordered by name', async () => {
    prisma.category.findMany.mockResolvedValue([
      { id: 'c1', name: 'Basquete', slug: 'basquete', icon: 'ball' },
    ]);
    const res = await service.listCategories();
    expect(prisma.category.findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
    expect(res[0].slug).toBe('basquete');
  });

  it('listMatchesByCategory throws when category missing', async () => {
    prisma.category.findUnique.mockResolvedValue(null);
    await expect(service.listMatchesByCategory('cX')).rejects.toBeInstanceOf(
      CategoryNotFoundError,
    );
  });

  it('listMatchesByCategory returns matches for an existing category', async () => {
    prisma.category.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.match.findMany.mockResolvedValue([{ id: 'm1', homeTeam: 'A', awayTeam: 'B' }]);
    const res = await service.listMatchesByCategory('c1');
    expect(prisma.match.findMany).toHaveBeenCalledWith({
      where: { categoryId: 'c1' },
      orderBy: { startsAt: 'asc' },
    });
    expect(res[0].id).toBe('m1');
  });

  it('getMatch throws MatchNotFoundError when missing', async () => {
    prisma.match.findUnique.mockResolvedValue(null);
    await expect(service.getMatch('mX')).rejects.toBeInstanceOf(MatchNotFoundError);
  });

  it('getMatch returns match with its entradas', async () => {
    prisma.match.findUnique.mockResolvedValue({
      id: 'm1',
      entradas: [{ id: 'e1', justification: 'x' }],
    });
    const res = await service.getMatch('m1');
    expect(prisma.match.findUnique).toHaveBeenCalledWith({
      where: { id: 'm1' },
      include: { entradas: { orderBy: { publishedAt: 'desc' } } },
    });
    expect(res.entradas).toHaveLength(1);
  });
});
