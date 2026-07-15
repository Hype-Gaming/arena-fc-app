import { NotFoundException } from '@nestjs/common';
import { MatchesService } from './matches.service';

describe('MatchesService', () => {
  let prisma: any;
  let service: MatchesService;

  const validInput = {
    categoryId: 'c1',
    homeTeam: 'A',
    awayTeam: 'B',
    competition: 'Liga',
    startsAt: '2026-07-01T18:00:00.000Z',
    status: 'scheduled' as const,
  };

  beforeEach(() => {
    prisma = {
      match: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new MatchesService(prisma);
  });

  it('creates a match coercing startsAt to a Date', async () => {
    prisma.match.create.mockResolvedValue({ id: 'm1' });
    await service.create(validInput);
    expect(prisma.match.create).toHaveBeenCalledWith({
      data: { ...validInput, startsAt: new Date(validInput.startsAt) },
    });
  });

  it('lists matches with category included, newest first', async () => {
    prisma.match.findMany.mockResolvedValue([]);
    await service.findAll();
    expect(prisma.match.findMany).toHaveBeenCalledWith({
      orderBy: { startsAt: 'desc' },
      include: { category: true },
    });
  });

  it('throws NotFound when updating a missing match', async () => {
    prisma.match.findUnique.mockResolvedValue(null);
    await expect(service.update('nope', { status: 'live' })).rejects.toThrow(NotFoundException);
  });

  it('updates status without touching startsAt', async () => {
    prisma.match.findUnique.mockResolvedValue({ id: 'm1' });
    prisma.match.update.mockResolvedValue({ id: 'm1', status: 'live' });
    await service.update('m1', { status: 'live' });
    expect(prisma.match.update).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: { status: 'live' },
    });
  });
});
