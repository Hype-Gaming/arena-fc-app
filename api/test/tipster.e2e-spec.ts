import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CreditsService } from '../src/modules/credits/credits.service';
import { InsufficientCreditsFilter } from '../src/common/filters/insufficient-credits.filter';

describe('Tipster (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let credits: CreditsService;
  let token: string;
  let userId: string;
  let matchId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new InsufficientCreditsFilter());
    await app.init();

    prisma = app.get(PrismaService);
    credits = app.get(CreditsService);

    // clean slate (FK-safe order)
    await prisma.chatMessage.deleteMany();
    await prisma.chatSession.deleteMany();
    await prisma.entrada.deleteMany();
    await prisma.match.deleteMany();
    await prisma.category.deleteMany();
    await prisma.creditTransaction.deleteMany();
    await prisma.user.deleteMany();

    const user = await prisma.user.create({
      data: { email: 'tipster-e2e@test.dev', role: 'user', level: 1, xp: 0 },
    });
    userId = user.id;

    // Mint a real access JWT with the same shape the JwtAuthGuard verifies
    // (payload { sub, email }) and the same secret used across the app.
    const jwt = app.get(JwtService);
    const config = app.get(ConfigService);
    token = await jwt.signAsync(
      { sub: user.id, email: user.email },
      { secret: config.get<string>('JWT_SECRET'), expiresIn: '15m' },
    );

    const category = await prisma.category.create({
      data: { name: 'Futebol', slug: 'futebol', icon: 'ball' },
    });
    const match = await prisma.match.create({
      data: {
        categoryId: category.id,
        homeTeam: 'São Paulo',
        awayTeam: 'Palmeiras',
        competition: 'Brasileirão',
        startsAt: new Date(Date.now() + 86_400_000),
        status: 'scheduled',
      },
    });
    matchId = match.id;
    await prisma.entrada.create({
      data: {
        matchId: match.id,
        market: 'Resultado Final',
        selection: 'São Paulo vence',
        odd: 2.15,
        justification: 'Mandante invicto em casa.',
        costInCredits: 3,
        status: 'pending',
        publishedAt: new Date(),
      },
    });

    // give the user starting credits via the ledger (only legal way to add credits)
    await credits.applyTransaction({
      userId,
      type: 'grant',
      amount: 10,
      refType: 'e2e_seed',
      refId: 'seed',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /tipster/match-search rejects an unauthenticated request', async () => {
    await request(app.getHttpServer()).get('/tipster/match-search?q=sao').expect(401);
  });

  it('GET /tipster/match-search returns the fuzzy-matched registered match', async () => {
    const res = await request(app.getHttpServer())
      .get('/tipster/match-search?q=sao%20palmeiras')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.matches).toHaveLength(1);
    expect(res.body.matches[0].id).toBe(matchId);
  });

  it('GET /tipster/match-search?q= (empty) is a 400', async () => {
    await request(app.getHttpServer())
      .get('/tipster/match-search?q=')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('POST /tipster/analyze debits credit, returns the ENTRADA PRINCIPAL message, and persists chat', async () => {
    const res = await request(app.getHttpServer())
      .post('/tipster/analyze')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId })
      .expect(201);

    expect(res.body.message).toContain('ENTRADA PRINCIPAL');
    expect(res.body.message).toContain('São Paulo x Palmeiras');
    expect(res.body.balanceAfter).toBe(7); // 10 - 3

    // ledger reflects the debit
    const last = await prisma.creditTransaction.findFirst({
      where: { userId, refType: 'tipster_analyze' },
      orderBy: { createdAt: 'desc' },
    });
    expect(last?.amount).toBe(-3);
    expect(last?.balanceAfter).toBe(7);

    // chat persisted: 1 session, user + assistant messages
    const session = await prisma.chatSession.findFirst({ where: { userId } });
    expect(session).toBeTruthy();
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: session!.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(messages[1].entradaId).toBeTruthy();
  });

  it('POST /tipster/analyze returns 404 for an unknown match', async () => {
    await request(app.getHttpServer())
      .post('/tipster/analyze')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'does-not-exist' })
      .expect(404);
  });
});
