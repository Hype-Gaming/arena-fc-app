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
    const svc = new AdminTeamsService(prisma);

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
    delete process.env.API_FOOTEBALL_KEY;
    const svc = new AdminTeamsService(makePrisma());
    await expect(svc.sync(71, 2024)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('accepts the legacy API_FOOTEBALL_KEY env name', async () => {
    delete process.env.API_FOOTBALL_KEY;
    process.env.API_FOOTEBALL_KEY = 'legacy';
    fetchMock.mockResolvedValue({
      json: () => Promise.resolve({ errors: [], results: 0, response: [] }),
    });
    const svc = new AdminTeamsService(makePrisma());
    await svc.sync(71, 2024);
    expect(fetchMock.mock.calls[0][1].headers['x-apisports-key']).toBe('legacy');
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
    const svc = new AdminTeamsService(makePrisma());
    await expect(svc.sync(71, 2025)).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('throws 502 when the API is unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    const svc = new AdminTeamsService(makePrisma());
    await expect(svc.sync(71, 2024)).rejects.toBeInstanceOf(BadGatewayException);
  });
});

describe('AdminTeamsService.list', () => {
  it('filters by name case-insensitively when q is given', async () => {
    process.env.API_FOOTBALL_KEY = 'k';
    const prisma = makePrisma();
    const svc = new AdminTeamsService(prisma);
    await svc.list('pal');
    expect((prisma.team.findMany as jest.Mock).mock.calls[0][0].where).toEqual({
      name: { contains: 'pal', mode: 'insensitive' },
    });
  });
});
