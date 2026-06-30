import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CreditsService } from '../src/modules/credits/credits.service';
import { JwtAuthGuard } from '../src/modules/auth/jwt-auth.guard';

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
      // bypass real JWT: inject a fixed user
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: any) => {
          ctx.switchToHttp().getRequest().user = { id: userId, role: 'user' };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
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
});
