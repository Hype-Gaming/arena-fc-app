import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
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

describe('TipsterService.analyze', () => {
  let service: TipsterService;

  const match = {
    id: 'm1',
    homeTeam: 'São Paulo',
    awayTeam: 'Palmeiras',
    competition: 'Brasileirão',
    startsAt: new Date(),
    status: 'scheduled',
  };
  const entradas = [
    { id: 'e1', matchId: 'm1', market: 'Resultado Final', selection: 'São Paulo vence', odd: 2.15, justification: 'Mandante forte.', costInCredits: 3, status: 'pending', publishedAt: new Date() },
  ];

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

    // $transaction runs the callback with a tx client that mirrors prismaMock
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock));
    prismaMock.chatSession.create.mockResolvedValue({ id: 's1', userId: 'u1', createdAt: new Date() });
    prismaMock.chatMessage.create.mockResolvedValue({ id: 'msg', sessionId: 's1' });
    creditsMock.applyTransaction.mockResolvedValue({ id: 'ct1', balanceAfter: 7 });
  });

  it('throws NotFound when the match does not exist', async () => {
    prismaMock.match.findUnique.mockResolvedValue(null);
    await expect(service.analyze('u1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(creditsMock.applyTransaction).not.toHaveBeenCalled();
  });

  it('throws NotFound when the match has no entradas', async () => {
    prismaMock.match.findUnique.mockResolvedValue(match);
    prismaMock.entrada.findMany.mockResolvedValue([]);
    await expect(service.analyze('u1', 'm1')).rejects.toBeInstanceOf(NotFoundException);
    expect(creditsMock.applyTransaction).not.toHaveBeenCalled();
  });

  it('debits via CreditsService using the principal entrada cost, then persists chat', async () => {
    prismaMock.match.findUnique.mockResolvedValue(match);
    prismaMock.entrada.findMany.mockResolvedValue(entradas);

    const result = await service.analyze('u1', 'm1');

    // money moves only through CreditsService.applyTransaction, inside the tx.
    // Real signature: applyTransaction(input, tx) — tx is the 2nd positional arg.
    expect(creditsMock.applyTransaction).toHaveBeenCalledWith(
      {
        userId: 'u1',
        type: 'unlock',
        amount: -3,
        refType: 'tipster_analyze',
        refId: 'e1',
      },
      prismaMock,
    );

    // session + 2 messages (user prompt, assistant analysis) persisted
    expect(prismaMock.chatSession.create).toHaveBeenCalledWith({ data: { userId: 'u1' } });
    expect(prismaMock.chatMessage.create).toHaveBeenCalledTimes(2);

    const assistantCall = prismaMock.chatMessage.create.mock.calls.find(
      ([arg]: any[]) => arg.data.role === 'assistant',
    );
    expect(assistantCall[0].data).toMatchObject({
      sessionId: 's1',
      role: 'assistant',
      entradaId: 'e1',
    });
    expect(assistantCall[0].data.content).toContain('ENTRADA PRINCIPAL');

    expect(result).toMatchObject({
      sessionId: 's1',
      entradaId: 'e1',
      balanceAfter: 7,
    });
    expect(result.message).toContain('São Paulo x Palmeiras');
  });

  it('does not persist chat when the debit fails (propagates the error)', async () => {
    prismaMock.match.findUnique.mockResolvedValue(match);
    prismaMock.entrada.findMany.mockResolvedValue(entradas);
    creditsMock.applyTransaction.mockRejectedValue(new Error('Insufficient credits'));

    await expect(service.analyze('u1', 'm1')).rejects.toThrow('Insufficient credits');
    expect(prismaMock.chatMessage.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'assistant' }) }),
    );
  });
});
