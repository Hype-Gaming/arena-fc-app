import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { signTestAccess } from './utils/auth';

describe('Admin (e2e) — guard', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a non-admin token with 403', async () => {
    const user = await prisma.user.create({
      data: { email: `u-${Date.now()}@x.com`, role: 'user' },
    });
    const token = await signTestAccess(user.id, user.email);
    await request(app.getHttpServer())
      .get('/admin/categories')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('rejects a request with no token with 401', async () => {
    await request(app.getHttpServer()).get('/admin/categories').expect(401);
  });
});

describe('Admin (e2e) — admin CRUD', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let adminSession: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const admin = await prisma.user.create({
      data: { email: `admin-${Date.now()}@x.com`, role: 'admin' },
    });
    adminToken = await signTestAccess(admin.id, admin.email);
    const session = await request(app.getHttpServer())
      .post('/auth/admin/session')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);
    adminSession = session.body.adminAccessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // Admin routes need both factors: the access token AND the admin-session header.
  const auth = (req: request.Test) =>
    req
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Admin-Session', `Bearer ${adminSession}`);

  it('creates a category, match, entrada and marks it green', async () => {
    const cat = await auth(
      request(app.getHttpServer())
        .post('/admin/categories')
        .send({ name: 'Futebol', slug: `fut-${Date.now()}`, icon: 'ball' }),
    ).expect(201);

    const match = await auth(
      request(app.getHttpServer()).post('/admin/matches').send({
        categoryId: cat.body.id,
        homeTeam: 'A',
        awayTeam: 'B',
        competition: 'Liga',
        startsAt: '2026-07-01T18:00:00.000Z',
        status: 'scheduled',
      }),
    ).expect(201);

    const entrada = await auth(
      request(app.getHttpServer()).post('/admin/entradas').send({
        matchId: match.body.id,
        market: 'Resultado',
        selection: 'Casa',
        odd: 1.85,
        justification: 'porque sim',
        costInCredits: 2,
      }),
    ).expect(201);
    expect(entrada.body.status).toBe('pending');

    const marked = await auth(
      request(app.getHttpServer())
        .patch(`/admin/entradas/${entrada.body.id}/result`)
        .send({ result: 'green' }),
    ).expect(200);
    expect(marked.body.status).toBe('green');
  });

  it('rejects an invalid result value with 400', async () => {
    const cat = await auth(
      request(app.getHttpServer())
        .post('/admin/categories')
        .send({ name: 'X', slug: `x-${Date.now()}`, icon: 'i' }),
    ).expect(201);
    const match = await auth(
      request(app.getHttpServer()).post('/admin/matches').send({
        categoryId: cat.body.id,
        homeTeam: 'A',
        awayTeam: 'B',
        competition: 'L',
        startsAt: '2026-07-01T18:00:00.000Z',
        status: 'scheduled',
      }),
    ).expect(201);
    const entrada = await auth(
      request(app.getHttpServer()).post('/admin/entradas').send({
        matchId: match.body.id,
        market: 'm',
        selection: 's',
        odd: 1.5,
        justification: 'j',
        costInCredits: 1,
      }),
    ).expect(201);
    await auth(
      request(app.getHttpServer())
        .patch(`/admin/entradas/${entrada.body.id}/result`)
        .send({ result: 'maybe' }),
    ).expect(400);
  });

  it('lists users with derived balances', async () => {
    const res = await auth(request(app.getHttpServer()).get('/admin/users')).expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.every((u: any) => typeof u.balance === 'number')).toBe(true);
  });
});
