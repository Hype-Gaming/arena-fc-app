import { AutoBilhetesService, selectAutomaticPicks } from './auto-bilhetes.service';

function event(id: string, hours: number) {
  const startsAt = new Date(Date.now() + hours * 60 * 60_000);
  return {
    externalId: id,
    homeTeam: `Casa ${id}`,
    awayTeam: `Fora ${id}`,
    competition: 'Liga teste',
    countryIso: 'BRA',
    startsAt,
    deepLink: `https://esportiva.bet.br/event/${id}`,
    homeLogo: null,
    awayLogo: null,
    markets: [
      {
        typeId: 1,
        key: '1x2',
        name: 'Resultado final',
        selections: [
          { label: `Casa ${id}`, odd: 1.5, line: null, oddId: Number(`${id}01`) },
          { label: 'Empate', odd: 2.4, line: null, oddId: Number(`${id}02`) },
          { label: `Fora ${id}`, odd: 1.85, line: null, oddId: Number(`${id}03`) },
        ],
      },
      {
        typeId: 166,
        key: 'corners',
        name: 'Total de escanteios',
        selections: [
          { label: 'Mais de 8.5', odd: 1.9, line: 8.5, oddId: Number(`${id}04`) },
        ],
      },
    ],
  };
}

describe('automatic football bilhetes', () => {
  it('selects real outcomes across plan categories and secondary markets', () => {
    const picks = selectAutomaticPicks([event('11', 2), event('12', 3), event('13', 4)]);
    expect(picks.some((pick) => pick.categoria === 'safes')).toBe(true);
    expect(picks.some((pick) => pick.categoria === 'pro')).toBe(true);
    expect(picks.some((pick) => pick.categoria === 'ultra')).toBe(true);
    expect(picks.some((pick) => pick.categoria === 'alavancagem')).toBe(true);
    expect(picks.some((pick) =>
      pick.categoria === 'secundario' && pick.market.key === 'corners',
    )).toBe(true);
    expect(picks.every((pick) => pick.selection.oddId > 0)).toBe(true);
  });

  it('syncs, enriches and idempotently upserts singles plus a daily multiple', async () => {
    const rows = [event('21', 2), event('22', 3), event('23', 4)];
    const prisma = {
      sportEvent: {
        findMany: jest.fn().mockResolvedValue(rows.map((item, index) => ({
          id: `db-${index}`,
          externalId: item.externalId,
          startsAt: item.startsAt,
        }))),
        update: jest.fn().mockResolvedValue({}),
      },
      bilhete: { upsert: jest.fn().mockResolvedValue({}) },
    };
    const feed = {
      sync: jest.fn().mockResolvedValue({ provider: 'altenar', fetched: 3, upserted: 3 }),
      getEventPreview: jest.fn((id: string) =>
        Promise.resolve(rows.find((item) => item.externalId === id)),
      ),
    };
    const service = new AutoBilhetesService(prisma as never, feed as never);

    const summary = await service.generateDaily();

    expect(summary).toEqual({ synced: 3, detailed: 3, createdOrUpdated: 16, skippedDetails: 0 });
    expect(prisma.sportEvent.update).toHaveBeenCalledTimes(3);
    expect(prisma.bilhete.upsert).toHaveBeenCalledTimes(16);
    const calls = prisma.bilhete.upsert.mock.calls.map(([arg]) => arg);
    expect(calls.some((arg) => String(arg.where.id).startsWith('auto-multiplas-'))).toBe(true);
    expect(calls.every((arg) => arg.create.esportivaShareUrl?.startsWith('https://'))).toBe(true);
  });
});
