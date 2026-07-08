import { SettleService } from './settle.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SportsFeedService } from '../sports-feed/sports-feed.service';

const OVER_2H = new Date(Date.now() - 3 * 60 * 60 * 1000);

function make(prisma: any, feed: any) {
  return new SettleService(
    prisma as unknown as PrismaService,
    feed as unknown as SportsFeedService,
  );
}

describe('SettleService.captureLiveScores', () => {
  it('writes each live score onto its matching SportEvent', async () => {
    const feed = {
      fetchLive: jest.fn().mockResolvedValue([
        { externalId: 'e1', homeScore: 1, awayScore: 0 },
        { externalId: 'e2', homeScore: 2, awayScore: 2 },
      ]),
    };
    const prisma = { sportEvent: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };

    const updated = await make(prisma, feed).captureLiveScores();

    expect(updated).toBe(2);
    expect(prisma.sportEvent.updateMany).toHaveBeenCalledWith({
      where: { externalId: 'e1' },
      data: { homeScore: 1, awayScore: 0, scoreSeenAt: expect.any(Date) },
    });
  });
});

describe('SettleService.settlePending', () => {
  function prismaWith(bilhetes: any[], events: any[]) {
    return {
      bilhete: {
        findMany: jest.fn().mockResolvedValue(bilhetes),
        update: jest.fn().mockResolvedValue({}),
      },
      sportEvent: {
        findMany: jest.fn().mockResolvedValue(events),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
  }

  it('only considers pending published tickets whose match window has elapsed', async () => {
    const prisma = prismaWith([], []);
    await make(prisma, {}).settlePending();

    const where = prisma.bilhete.findMany.mock.calls[0][0].where;
    expect(where.resultado).toBe('pending');
    expect(where.publishedAt).toEqual({ not: null });
    expect(where.eventExternalId).toEqual({ not: null });
    expect(where.startsAt.lt).toBeInstanceOf(Date);
  });

  it('greens a ticket whose captured score wins the market and reds a losing one', async () => {
    const prisma = prismaWith(
      [
        { id: 'b1', mercado: '1x2', selecao: 'Botafogo', linha: null, homeTeam: 'Botafogo', awayTeam: 'Flamengo', startsAt: OVER_2H, eventExternalId: 'e1' },
        { id: 'b2', mercado: 'btts', selecao: 'Sim', linha: null, homeTeam: 'Botafogo', awayTeam: 'Flamengo', startsAt: OVER_2H, eventExternalId: 'e1' },
      ],
      [{ externalId: 'e1', homeScore: 2, awayScore: 0, finishedAt: null }],
    );

    const res = await make(prisma, {}).settlePending();

    expect(res.settled).toBe(2);
    expect(prisma.bilhete.update).toHaveBeenCalledWith({ where: { id: 'b1' }, data: { resultado: 'green' } });
    expect(prisma.bilhete.update).toHaveBeenCalledWith({ where: { id: 'b2' }, data: { resultado: 'red' } });
  });

  it('leaves a ticket pending when no score was captured', async () => {
    const prisma = prismaWith(
      [{ id: 'b1', mercado: '1x2', selecao: 'Botafogo', linha: null, homeTeam: 'Botafogo', awayTeam: 'Flamengo', startsAt: OVER_2H, eventExternalId: 'e9' }],
      [], // no matching event with a score
    );

    const res = await make(prisma, {}).settlePending();

    expect(res.settled).toBe(0);
    expect(res.skipped).toBe(1);
    expect(prisma.bilhete.update).not.toHaveBeenCalled();
  });

  it('leaves an ungradeable market (push/unknown) pending', async () => {
    const prisma = prismaWith(
      [{ id: 'b1', mercado: 'placar_exato', selecao: '1:0', linha: null, homeTeam: 'A', awayTeam: 'B', startsAt: OVER_2H, eventExternalId: 'e1' }],
      [{ externalId: 'e1', homeScore: 1, awayScore: 0, finishedAt: null }],
    );

    const res = await make(prisma, {}).settlePending();

    expect(res.settled).toBe(0);
    expect(res.skipped).toBe(1);
    expect(prisma.bilhete.update).not.toHaveBeenCalled();
  });
});
