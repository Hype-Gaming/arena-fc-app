// api/src/modules/sports-feed/sports-feed.service.spec.ts
import { SportsFeedService } from './sports-feed.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NormalizedEvent, SportsFeedProvider } from './sports-feed.types';

const EVENT: NormalizedEvent = {
  externalId: '16027580',
  homeTeam: 'Botafogo',
  awayTeam: 'Santos',
  competition: 'Brasileirão A',
  startsAt: new Date('2026-07-16T22:30:00Z'),
  oddHome: 1.9,
  oddDraw: 3.4,
  oddAway: 4.1,
  deepLink: 'https://esportiva.bet.br/e/16027580',
};

function makeProvider(events: NormalizedEvent[]): SportsFeedProvider {
  return { name: 'altenar', fetchUpcoming: jest.fn().mockResolvedValue(events) };
}

function makePrisma() {
  return {
    sportEvent: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue({}),
    },
  } as unknown as PrismaService;
}

describe('SportsFeedService.sync', () => {
  it('upserts each fetched event keyed by (provider, externalId)', async () => {
    const prisma = makePrisma();
    const svc = new SportsFeedService(prisma, makeProvider([EVENT]));

    const summary = await svc.sync();

    expect(summary).toEqual({ provider: 'altenar', fetched: 1, upserted: 1 });
    const call = (prisma.sportEvent.upsert as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({
      provider_externalId: { provider: 'altenar', externalId: '16027580' },
    });
    expect(call.create).toMatchObject({
      provider: 'altenar',
      homeTeam: 'Botafogo',
      oddHome: 1.9,
      deepLink: 'https://esportiva.bet.br/e/16027580',
    });
  });
});

describe('SportsFeedService.list', () => {
  it('filters by either team name when q is given', async () => {
    const prisma = makePrisma();
    const svc = new SportsFeedService(prisma, makeProvider([]));
    await svc.list('bota');
    const where = (prisma.sportEvent.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.OR).toEqual([
      { homeTeam: { contains: 'bota', mode: 'insensitive' } },
      { awayTeam: { contains: 'bota', mode: 'insensitive' } },
    ]);
  });
});
