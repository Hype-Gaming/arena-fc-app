import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { signTestAccess } from './utils/auth';

describe('Tutorial (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let adminSession: string;
  let userToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.tutorialStep.deleteMany({});
    const admin = await prisma.user.create({
      data: { email: `tadmin-${Date.now()}@x.com`, role: 'admin' },
    });
    const user = await prisma.user.create({
      data: { email: `tuser-${Date.now()}@x.com`, role: 'user' },
    });
    adminToken = await signTestAccess(admin.id, admin.email);
    userToken = await signTestAccess(user.id, user.email);
    const session = await request(app.getHttpServer())
      .post('/auth/admin/session')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);
    adminSession = session.body.adminAccessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('lets an admin publish a tutorial version', async () => {
    const res = await request(app.getHttpServer())
      .post('/tutorial/versions')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Admin-Session', `Bearer ${adminSession}`)
      .send({ steps: [{ title: 'Bem-vindo', body: 'Comece aqui' }] })
      .expect(201);
    expect(res.body.version).toBe(1);
    expect(res.body.count).toBe(1);
  });

  it('rejects publish from a non-admin with 403', async () => {
    await request(app.getHttpServer())
      .post('/tutorial/versions')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ steps: [{ title: 'x', body: 'y' }] })
      .expect(403);
  });

  it('serves the latest tutorial publicly (authenticated user) ', async () => {
    const res = await request(app.getHttpServer())
      .get('/tutorial/latest')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(res.body.version).toBe(1);
    expect(res.body.steps[0].title).toBe('Bem-vindo');
  });
});
