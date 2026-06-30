import { Test } from '@nestjs/testing';
import { TipsterService } from './tipster.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';

const prismaMock = {
  match: { findMany: jest.fn(), findUnique: jest.fn() },
  entrada: { findMany: jest.fn() },
  chatSession: { create: jest.fn() },
  chatMessage: { create: jest.fn() },
  $transaction: jest.fn(),
};

const creditsMock = { applyTransaction: jest.fn() };

describe('TipsterService.searchMatches', () => {
  let service: TipsterService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        TipsterService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CreditsService, useValue: creditsMock },
      ],
    }).compile();
    service = moduleRef.get(TipsterService);
  });

  it('queries only searchable (scheduled/live) matches and returns fuzzy-ranked results', async () => {
    prismaMock.match.findMany.mockResolvedValue([
      { id: 'm1', homeTeam: 'São Paulo', awayTeam: 'Palmeiras', competition: 'Brasileirão', startsAt: new Date(), status: 'scheduled' },
      { id: 'm2', homeTeam: 'Flamengo', awayTeam: 'Vasco', competition: 'Carioca', startsAt: new Date(), status: 'scheduled' },
    ]);

    const result = await service.searchMatches('sao palmeiras');

    expect(prismaMock.match.findMany).toHaveBeenCalledWith({
      where: { status: { in: ['scheduled', 'live'] } },
      orderBy: { startsAt: 'asc' },
      take: 200,
    });
    expect(result.map((m) => m.id)).toEqual(['m1']);
  });

  it('returns an empty array when nothing matches the query', async () => {
    prismaMock.match.findMany.mockResolvedValue([
      { id: 'm2', homeTeam: 'Flamengo', awayTeam: 'Vasco', competition: 'Carioca', startsAt: new Date(), status: 'scheduled' },
    ]);
    const result = await service.searchMatches('chelsea arsenal');
    expect(result).toEqual([]);
  });
});
