// api/src/modules/admin/teams.service.spec.ts
import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AdminTeamsService } from './teams.service';
import { PrismaService } from '../../prisma/prisma.service';

function makePrisma() {
  return {
    team: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue({}),
    },
  } as unknown as PrismaService;
}

const sportsFeed = { fetchLive: jest.fn().mockResolvedValue([]) } as any;
const logoCache = { warm: jest.fn(), get: jest.fn() } as any;

const ROW = (id: number, name: string) => ({
  team: { id, name, code: name.slice(0, 3).toUpperCase(), country: 'Brazil', logo: `https://x/${id}.png` },
});

describe('AdminTeamsService.sync', () => {
  const OLD_ENV = process.env;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env = { ...OLD_ENV, API_FOOTBALL_KEY: 'k123' };
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('upserts every returned team keyed by externalId', async () => {
    fetchMock.mockResolvedValue({
      json: () =>
        Promise.resolve({
          errors: [],
          results: 2,
          response: [ROW(118, 'Bahia'), ROW(121, 'Palmeiras')],
        }),
    });
    const prisma = makePrisma();
    const svc = new AdminTeamsService(prisma, sportsFeed, logoCache);

    const summary = await svc.sync(71, 2024);

    expect(summary).toEqual({ league: 71, season: 2024, fetched: 2, upserted: 2 });
    expect(prisma.team.upsert).toHaveBeenCalledTimes(2);
    const first = (prisma.team.upsert as jest.Mock).mock.calls[0][0];
    expect(first.where).toEqual({ externalId: 118 });
    expect(first.create).toMatchObject({ name: 'Bahia', logoUrl: 'https://x/118.png', season: 2024 });
    // key must be sent via the api-sports header
    expect(fetchMock.mock.calls[0][1].headers['x-apisports-key']).toBe('k123');
  });

  it('throws 503 when no API key is configured', async () => {
    delete process.env.API_FOOTBALL_KEY;
    const svc = new AdminTeamsService(makePrisma(), sportsFeed, logoCache);
    await expect(svc.sync(71, 2024)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('surfaces provider errors as 502 (e.g. season outside the free window)', async () => {
    fetchMock.mockResolvedValue({
      json: () =>
        Promise.resolve({
          errors: { plan: 'Free plans do not have access to this season, try from 2022 to 2024.' },
          results: 0,
          response: [],
        }),
    });
    const svc = new AdminTeamsService(makePrisma(), sportsFeed, logoCache);
    await expect(svc.sync(71, 2025)).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('throws 502 when the API is unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    const svc = new AdminTeamsService(makePrisma(), sportsFeed, logoCache);
    await expect(svc.sync(71, 2024)).rejects.toBeInstanceOf(BadGatewayException);
  });
});

describe('AdminTeamsService.list', () => {
  it('filters by name case-insensitively when q is given', async () => {
    process.env.API_FOOTBALL_KEY = 'k';
    const prisma = makePrisma();
    const svc = new AdminTeamsService(prisma, sportsFeed, logoCache);
    await svc.list('pal');
    expect((prisma.team.findMany as jest.Mock).mock.calls[0][0].where).toEqual({
      name: { contains: 'pal', mode: 'insensitive' },
    });
  });
});

describe('AdminTeamsService.syncLiveLogos', () => {
  const OLD_ENV = process.env;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env = { ...OLD_ENV, API_FOOTBALL_KEY: 'k123' };
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.clearAllMocks();
  });
  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('searches only unmatched live teams, upserts + warms the cache', async () => {
    const prisma = makePrisma();
    // Bayern is already in the catalog → only Fortuna needs a search.
    (prisma.team.findMany as jest.Mock).mockResolvedValue([
      { externalId: 5, name: 'Bayern', logoUrl: 'https://x/5.png' },
    ]);
    sportsFeed.fetchLive.mockResolvedValue([
      { homeTeam: 'Fortuna Dusseldorf', awayTeam: 'Bayern' },
    ]);
    fetchMock.mockResolvedValue({
      json: () =>
        Promise.resolve({ errors: [], results: 1, response: [ROW(158, 'Fortuna Düsseldorf')] }),
    });

    const svc = new AdminTeamsService(prisma, sportsFeed, logoCache);
    const summary = await svc.syncLiveLogos();

    expect(summary).toMatchObject({
      liveTeams: 2,
      alreadyMatched: 1,
      searched: 1,
      added: 1,
      notFound: 0,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1); // Bayern was NOT searched
    expect(fetchMock.mock.calls[0][0]).toContain('search=');
    expect((prisma.team.upsert as jest.Mock).mock.calls[0][0].where).toEqual({
      externalId: 158,
    });
    expect(logoCache.warm).toHaveBeenCalledWith(158, 'https://x/158.png');
  });

  it('prefers the same-country search result (country tiebreak)', async () => {
    const prisma = makePrisma();
    sportsFeed.fetchLive.mockResolvedValue([
      { homeTeam: 'Barcelona EC RJ', awayTeam: 'Barcelona EC RJ', countryIso: 'BRA' },
    ]);
    fetchMock.mockResolvedValue({
      json: () =>
        Promise.resolve({
          errors: [],
          results: 2,
          response: [
            { team: { id: 529, name: 'Barcelona', code: 'BAR', country: 'Spain', logo: 'https://x/529.png' } },
            { team: { id: 9001, name: 'Barcelona', code: null, country: 'Brazil', logo: 'https://x/9001.png' } },
          ],
        }),
    });

    const svc = new AdminTeamsService(prisma, sportsFeed, logoCache);
    const summary = await svc.syncLiveLogos();

    expect(summary).toMatchObject({ added: 1 });
    // BRA event → the Brazilian Barcelona (9001), not Spain's (529).
    expect((prisma.team.upsert as jest.Mock).mock.calls[0][0].where).toEqual({
      externalId: 9001,
    });
  });

  it('counts a team the API can not find without upserting', async () => {
    const prisma = makePrisma();
    sportsFeed.fetchLive.mockResolvedValue([
      { homeTeam: 'Obscure Amateur XI', awayTeam: 'Obscure Amateur XI' },
    ]);
    fetchMock.mockResolvedValue({
      json: () => Promise.resolve({ errors: [], results: 0, response: [] }),
    });

    const svc = new AdminTeamsService(prisma, sportsFeed, logoCache);
    const summary = await svc.syncLiveLogos();

    expect(summary).toMatchObject({ searched: 1, added: 0, notFound: 1 });
    expect(prisma.team.upsert).not.toHaveBeenCalled();
    expect(logoCache.warm).not.toHaveBeenCalled();
  });

  it('throws 503 when no API key is configured', async () => {
    delete process.env.API_FOOTBALL_KEY;
    const svc = new AdminTeamsService(makePrisma(), sportsFeed, logoCache);
    await expect(svc.syncLiveLogos()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
