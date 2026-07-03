import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TipsterService } from './tipster.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { InsufficientCreditsError } from '../credits/errors';
import { SportsFeedService } from '../sports-feed/sports-feed.service';
import { AI_ANALYSIS_PROVIDER } from './ai/ai-analysis.types';
import { MockAnalysisProvider } from './ai/mock.provider';

const prismaMock = {
  match: { findMany: jest.fn(), findUnique: jest.fn() },
  entrada: { findMany: jest.fn() },
  chatSession: { create: jest.fn() },
  chatMessage: { create: jest.fn() },
  user: { findUnique: jest.fn() },
  creditTransaction: { findFirst: jest.fn() },
  $transaction: jest.fn(),
};

const creditsMock = { applyTransaction: jest.fn(), getBalance: jest.fn() };
const sportsFeedMock = { fetchLive: jest.fn() };
// Real deterministic provider so message assertions match the shipped output;
// spied so we can assert it is NOT called on the pre-check short-circuit.
const aiProvider = new MockAnalysisProvider();

describe('TipsterService.searchMatches', () => {
  let service: TipsterService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        TipsterService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CreditsService, useValue: creditsMock },
        { provide: SportsFeedService, useValue: sportsFeedMock },
        { provide: AI_ANALYSIS_PROVIDER, useValue: aiProvider },
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
        { provide: SportsFeedService, useValue: sportsFeedMock },
        { provide: AI_ANALYSIS_PROVIDER, useValue: aiProvider },
      ],
    }).compile();
    service = moduleRef.get(TipsterService);

    // $transaction runs the callback with a tx client that mirrors prismaMock
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock));
    prismaMock.chatSession.create.mockResolvedValue({ id: 's1', userId: 'u1', createdAt: new Date() });
    prismaMock.chatMessage.create.mockResolvedValue({ id: 'msg', sessionId: 's1' });
    creditsMock.applyTransaction.mockResolvedValue({ id: 'ct1', balanceAfter: 7 });
    // Default: affordable balance and no unlimited pass → normal debit path.
    creditsMock.getBalance.mockResolvedValue(100);
    prismaMock.user.findUnique.mockResolvedValue({ iaUnlimitedUntil: null });
    sportsFeedMock.fetchLive.mockResolvedValue([]);
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

  it('short-circuits with InsufficientCredits before calling the AI when the balance is too low', async () => {
    prismaMock.match.findUnique.mockResolvedValue(match);
    prismaMock.entrada.findMany.mockResolvedValue(entradas); // cost 3
    creditsMock.getBalance.mockResolvedValue(1); // below cost
    const aiSpy = jest.spyOn(aiProvider, 'analyze');

    await expect(service.analyze('u1', 'm1')).rejects.toBeInstanceOf(
      InsufficientCreditsError,
    );
    expect(aiSpy).not.toHaveBeenCalled(); // no paid AI call wasted
    expect(creditsMock.applyTransaction).not.toHaveBeenCalled();
    aiSpy.mockRestore();
  });

  it('skips the credit debit when an unlimited pass is active, keeping the balance', async () => {
    prismaMock.match.findUnique.mockResolvedValue(match);
    prismaMock.entrada.findMany.mockResolvedValue(entradas);
    prismaMock.user.findUnique.mockResolvedValue({
      iaUnlimitedUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    });
    // current balance is read from the latest credit row inside the tx
    prismaMock.creditTransaction.findFirst.mockResolvedValue({ balanceAfter: 42 });

    const result = await service.analyze('u1', 'm1');

    expect(creditsMock.applyTransaction).not.toHaveBeenCalled(); // free analysis
    expect(prismaMock.chatMessage.create).toHaveBeenCalledTimes(2); // still persisted
    expect(result).toMatchObject({ sessionId: 's1', entradaId: 'e1', balanceAfter: 42 });
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

describe('TipsterService.analyzeLive', () => {
  let service: TipsterService;

  const liveEvent = {
    externalId: 'x1',
    homeTeam: 'Bayern',
    awayTeam: 'Werder',
    competition: 'Bundesliga',
    startsAt: new Date(),
    oddHome: 1.5,
    oddDraw: 3.4,
    oddAway: 6.0,
    deepLink: 'https://x/x1',
    minute: "30'",
    homeScore: 1,
    awayScore: 0,
    statusText: '2ª parte',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        TipsterService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CreditsService, useValue: creditsMock },
        { provide: SportsFeedService, useValue: sportsFeedMock },
        { provide: AI_ANALYSIS_PROVIDER, useValue: aiProvider },
      ],
    }).compile();
    service = moduleRef.get(TipsterService);

    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock));
    prismaMock.chatSession.create.mockResolvedValue({ id: 's9', userId: 'u1' });
    prismaMock.chatMessage.create.mockResolvedValue({ id: 'msg' });
    creditsMock.applyTransaction.mockResolvedValue({ id: 'ct', balanceAfter: 5 });
    creditsMock.getBalance.mockResolvedValue(100);
    prismaMock.user.findUnique.mockResolvedValue({ iaUnlimitedUntil: null });
  });

  it('analyzes the picked live match, debits the flat cost, entradaId null', async () => {
    sportsFeedMock.fetchLive.mockResolvedValue([liveEvent]);

    const result = await service.analyzeLive('u1', 'x1');

    expect(creditsMock.applyTransaction).toHaveBeenCalledWith(
      {
        userId: 'u1',
        type: 'unlock',
        amount: -1, // LIVE_ANALYSIS_COST
        refType: 'tipster_live',
        refId: 'x1',
      },
      prismaMock,
    );
    const assistantCall = prismaMock.chatMessage.create.mock.calls.find(
      ([arg]: any[]) => arg.data.role === 'assistant',
    );
    expect(assistantCall[0].data.entradaId).toBeNull();
    expect(result).toMatchObject({ entradaId: null, balanceAfter: 5 });
    expect(result.message).toContain('Bayern x Werder');
  });

  it('throws NotFound when the live match is no longer in the feed', async () => {
    sportsFeedMock.fetchLive.mockResolvedValue([liveEvent]);
    await expect(service.analyzeLive('u1', 'gone')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(creditsMock.applyTransaction).not.toHaveBeenCalled();
  });

  it('throws NotFound when every 1X2 leg is suspended (no candidates)', async () => {
    sportsFeedMock.fetchLive.mockResolvedValue([
      { ...liveEvent, oddHome: null, oddDraw: null, oddAway: null },
    ]);
    await expect(service.analyzeLive('u1', 'x1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(creditsMock.applyTransaction).not.toHaveBeenCalled();
  });

  it('is free under an active unlimited pass (no debit)', async () => {
    sportsFeedMock.fetchLive.mockResolvedValue([liveEvent]);
    prismaMock.user.findUnique.mockResolvedValue({
      iaUnlimitedUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    });
    prismaMock.creditTransaction.findFirst.mockResolvedValue({ balanceAfter: 9 });

    const result = await service.analyzeLive('u1', 'x1');

    expect(creditsMock.applyTransaction).not.toHaveBeenCalled();
    expect(result.balanceAfter).toBe(9);
  });
});
