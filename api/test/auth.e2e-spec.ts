import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `e2e-${Date.now()}@example.com`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('rejects an invalid email on login with 400', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'nope' })
      .expect(400);
  });

  it('logs in with a valid email and completes the refresh rotation', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email })
      .expect(200);

    expect(loginRes.body.accessToken).toEqual(expect.any(String));
    expect(loginRes.body.refreshToken).toMatch(/^[a-f0-9]{96}$/);

    const refreshRes = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: loginRes.body.refreshToken })
      .expect(200);

    expect(refreshRes.body.refreshToken).toMatch(/^[a-f0-9]{96}$/);
    expect(refreshRes.body.refreshToken).not.toBe(loginRes.body.refreshToken);

    // The rotated-away refresh token is now rejected.
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: loginRes.body.refreshToken })
      .expect(401);
  });
});
