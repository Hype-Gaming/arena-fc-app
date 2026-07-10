// api/src/modules/sports-feed/sports-feed.service.spec.ts
import { SportsFeedService } from './sports-feed.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NormalizedEvent, SportsFeedProvider } from './sports-feed.types';

const EVENT: NormalizedEvent = {
  externalId: '16027580',
  homeTeam: 'Botafogo',
  awayTeam: 'Santos',
  competition: 'Brasileirão A',
  countryIso: 'BRA',
  startsAt: new Date('2026-07-16T22:30:00Z'),
  oddHome: 1.9,
  oddDraw: 3.4,
  oddAway: 4.1,
  markets: [],
  deepLink: 'https://esportiva.bet.br/e/16027580',
};

function makeProvider(events: NormalizedEvent[]): SportsFeedProvider {
  return {
    name: 'altenar',
    fetchUpcoming: jest.fn().mockResolvedValue(events),
    fetchLive: jest.fn().mockResolvedValue([]),
    fetchEventPreview: jest.fn().mockResolvedValue({
      externalId: '1',
      homeTeam: '',
      awayTeam: '',
      competition: null,
      countryIso: null,
      startsAt: new Date(0),
      deepLink: '',
      markets: [],
    }),
  };
}

function makePrisma() {
  return {
    sportEvent: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue({}),
    },
    team: { findMany: jest.fn().mockResolvedValue([]) },
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

describe('SportsFeedService.getEventPreview', () => {
  const preview = {
    externalId: '16993776',
    homeTeam: 'Suíça',
    awayTeam: 'Colômbia',
    competition: 'Copa do Mundo 2026',
    countryIso: null,
    startsAt: new Date('2026-07-07T20:00:00Z'),
    deepLink: 'https://x/16993776',
    markets: [{ typeId: 1, key: '1x2', name: 'Vencedor', selections: [] }],
  };

  it('parses the pasted link, previews the event and attaches catalog crests', async () => {
    const prisma = makePrisma();
    (prisma.team.findMany as jest.Mock).mockResolvedValue([
      { externalId: 15, name: 'Switzerland', logoUrl: 'https://x/15.png' },
    ]);
    const provider = makeProvider([]);
    (provider.fetchEventPreview as jest.Mock).mockResolvedValue(preview);
    const svc = new SportsFeedService(prisma, provider);

    const out = await svc.getEventPreview(
      'https://esportiva.bet.br/sports/futebol/mundo/copa-do-mundo-2026/suica-vs-colombia/le-16993776',
    );

    expect(provider.fetchEventPreview).toHaveBeenCalledWith('16993776');
    // Suíça resolves Switzerland (id 15) via the seleção alias, from cache.
    expect(out.homeLogo).toBe('/api/team-logos/15.png');
    expect(out.awayLogo).toBeNull(); // Colômbia not in catalog → null
    expect(out.markets).toHaveLength(1);
  });

  it('rejects input with no recognizable event id', async () => {
    const svc = new SportsFeedService(makePrisma(), makeProvider([]));
    await expect(svc.getEventPreview('not a link')).rejects.toThrow();
  });
});

describe('SportsFeedService.fetchLive', () => {
  const liveEvent = {
    externalId: 'l1',
    homeTeam: 'Mjallby AIF',
    awayTeam: 'Unknown FC',
    homeLogo: null,
    awayLogo: null,
  };

  it('delegates to the provider and does not touch the events table', async () => {
    const prisma = makePrisma();
    const provider = makeProvider([]);
    (provider.fetchLive as jest.Mock).mockResolvedValue([liveEvent]);
    const svc = new SportsFeedService(prisma, provider);

    await svc.fetchLive();

    expect(provider.fetchLive).toHaveBeenCalled();
    expect(prisma.sportEvent.findMany).not.toHaveBeenCalled();
  });

  it('serves a burst of callers from one upstream fetch (short-TTL cache)', async () => {
    const prisma = makePrisma();
    const provider = makeProvider([]);
    (provider.fetchLive as jest.Mock).mockResolvedValue([liveEvent]);
    const svc = new SportsFeedService(prisma, provider);

    await svc.fetchLive();
    await svc.fetchLive();
    await svc.fetchLive();

    // Three viewers within the TTL collapse to a single upstream call.
    expect(provider.fetchLive).toHaveBeenCalledTimes(1);
  });

  it('cross-matches crests from the catalog and points at the cache URL', async () => {
    const prisma = makePrisma();
    (prisma.team.findMany as jest.Mock).mockResolvedValue([
      { externalId: 42, name: 'Mjällby', logoUrl: 'https://src/mjallby.png' },
    ]);
    const provider = makeProvider([]);
    (provider.fetchLive as jest.Mock).mockResolvedValue([liveEvent]);
    const svc = new SportsFeedService(prisma, provider);

    const [ev] = await svc.fetchLive();

    // Mjallby AIF → Mjällby (id 42), served from our cache, not hotlinked.
    expect(ev.homeLogo).toBe('/api/team-logos/42.png');
    expect(ev.awayLogo).toBeNull(); // no catalog match → stays null
  });
});

describe('SportsFeedService.teamLogoIndex', () => {
  it('scans the Team table once and reuses the built index within the TTL', async () => {
    const prisma = makePrisma();
    (prisma.team.findMany as jest.Mock).mockResolvedValue([
      { externalId: 42, name: 'Mjällby', logoUrl: 'https://src/mjallby.png' },
    ]);
    const svc = new SportsFeedService(prisma, makeProvider([]));

    await svc.teamLogoIndex();
    await svc.teamLogoIndex();

    expect(prisma.team.findMany).toHaveBeenCalledTimes(1);
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
