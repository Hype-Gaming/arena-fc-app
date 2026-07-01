import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CreditsService } from '../src/modules/credits/credits.service';
import { JwtAuthGuard } from '../src/modules/auth/jwt-auth.guard';
import { InsufficientCreditsFilter } from '../src/common/filters/insufficient-credits.filter';

describe('Tips (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let credits: CreditsService;
  let userId: string;
  let entradaId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      // bypass real JWT but mirror the REAL guard's req.user shape
      // ({ userId, email }) so this e2e actually exercises the controller's
      // user-field contract instead of a made-up { id } shape.
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: any) => {
          ctx.switchToHttp().getRequest().user = {
            userId,
            email: 'tips-e2e@test.dev',
          };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalFilters(new InsufficientCreditsFilter());
    await app.init();

    prisma = app.get(PrismaService);
    credits = app.get(CreditsService);
  });

  beforeEach(async () => {
    await prisma.entradaUnlock.deleteMany();
    await prisma.creditTransaction.deleteMany();
    await prisma.entrada.deleteMany();
    await prisma.match.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();

    const user = await prisma.user.create({
      data: { email: 'feed@test.dev', role: 'user' },
    });
    userId = user.id;

    const category = await prisma.category.create({
      data: { name: 'Futebol', slug: 'futebol', icon: 'soccer' },
    });
    const match = await prisma.match.create({
      data: {
        categoryId: category.id,
        homeTeam: 'A',
        awayTeam: 'B',
        competition: 'Liga',
        startsAt: new Date('2026-07-01T20:00:00Z'),
        status: 'scheduled',
      },
    });
    const entrada = await prisma.entrada.create({
      data: {
        matchId: match.id,
        market: '1X2',
        selection: 'Casa',
        odd: 1.85,
        justification: 'analise secreta',
        costInCredits: 10,
        status: 'pending',
        publishedAt: new Date('2026-06-30T10:00:00Z'),
      },
    });
    entradaId = entrada.id;

    // grant 15 credits so unlock (10) succeeds once
    await credits.applyTransaction({
      userId,
      type: 'grant',
      amount: 15,
      refType: 'test',
      refId: 'seed',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /tips/feed hides justification on locked entrada', async () => {
    const res = await request(app.getHttpServer()).get('/tips/feed').expect(200);
    const entrada = res.body.categories[0].matches[0].entradas[0];
    expect(entrada.locked).toBe(true);
    expect(entrada.justification).toBeNull();
    expect(entrada.market).toBe('1X2');
  });

  it('POST unlock debits 10 credits, returns justification, then is idempotent', async () => {
    const first = await request(app.getHttpServer())
      .post(`/tips/entradas/${entradaId}/unlock`)
      .expect(201);
    expect(first.body.alreadyUnlocked).toBe(false);
    expect(first.body.justification).toBe('analise secreta');
    expect(await credits.getBalance(userId)).toBe(5);

    const second = await request(app.getHttpServer())
      .post(`/tips/entradas/${entradaId}/unlock`)
      .expect(201);
    expect(second.body.alreadyUnlocked).toBe(true);
    expect(second.body.justification).toBe('analise secreta');
    // balance unchanged: not charged twice
    expect(await credits.getBalance(userId)).toBe(5);

    // exactly one EntradaUnlock row
    expect(await prisma.entradaUnlock.count({ where: { userId, entradaId } })).toBe(1);
  });

  it('GET /tips/feed shows justification after unlock', async () => {
    await request(app.getHttpServer())
      .post(`/tips/entradas/${entradaId}/unlock`)
      .expect(201);
    const res = await request(app.getHttpServer()).get('/tips/feed').expect(200);
    const entrada = res.body.categories[0].matches[0].entradas[0];
    expect(entrada.locked).toBe(false);
    expect(entrada.justification).toBe('analise secreta');
  });

  it('POST unlock on missing entrada returns 404', async () => {
    await request(app.getHttpServer())
      .post('/tips/entradas/00000000-0000-0000-0000-000000000000/unlock')
      .expect(404);
  });

  it('POST unlock with insufficient credits returns 402 INSUFFICIENT_CREDITS', async () => {
    // user has 15 credits (seeded); this entrada costs 20 -> debit must fail
    const match = await prisma.match.findFirst();
    const pricey = await prisma.entrada.create({
      data: {
        matchId: match!.id,
        market: 'O/U',
        selection: 'Over 2.5',
        odd: 2.1,
        justification: 'cara demais',
        costInCredits: 20,
        status: 'pending',
        publishedAt: new Date('2026-06-30T10:00:00Z'),
      },
    });

    const res = await request(app.getHttpServer())
      .post(`/tips/entradas/${pricey.id}/unlock`)
      .expect(402);

    expect(res.body.statusCode).toBe(402);
    expect(res.body.error).toBe('INSUFFICIENT_CREDITS');
    expect(res.body.currentBalance).toBe(15);
    expect(res.body.required).toBe(20);

    // no credits were debited and no unlock row created
    expect(await credits.getBalance(userId)).toBe(15);
    expect(
      await prisma.entradaUnlock.count({ where: { userId, entradaId: pricey.id } }),
    ).toBe(0);
  });
});
