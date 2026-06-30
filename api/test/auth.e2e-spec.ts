import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MAIL_SERVICE, MailService } from '../src/modules/auth/mail/mail.service';

class CapturingMailService implements MailService {
  public last?: { email: string; code: string };
  async sendOtp(email: string, code: string): Promise<void> {
    this.last = { email, code };
  }
}

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const mail = new CapturingMailService();
  const email = `e2e-${Date.now()}@example.com`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MAIL_SERVICE)
      .useValue(mail)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('rejects an invalid email on request-code with 400', async () => {
    await request(app.getHttpServer())
      .post('/auth/request-code')
      .send({ email: 'nope' })
      .expect(400);
  });

  it('completes the full request-code -> verify -> refresh flow', async () => {
    await request(app.getHttpServer())
      .post('/auth/request-code')
      .send({ email })
      .expect(200)
      .expect({ ok: true });

    expect(mail.last?.email).toBe(email);
    const code = mail.last!.code;
    expect(code).toMatch(/^\d{6}$/);

    const verifyRes = await request(app.getHttpServer())
      .post('/auth/verify')
      .send({ email, code })
      .expect(200);

    expect(verifyRes.body.accessToken).toEqual(expect.any(String));
    expect(verifyRes.body.refreshToken).toMatch(/^[a-f0-9]{96}$/);

    // The same code cannot be reused.
    await request(app.getHttpServer())
      .post('/auth/verify')
      .send({ email, code })
      .expect(401);

    const refreshRes = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: verifyRes.body.refreshToken })
      .expect(200);

    expect(refreshRes.body.refreshToken).toMatch(/^[a-f0-9]{96}$/);
    expect(refreshRes.body.refreshToken).not.toBe(verifyRes.body.refreshToken);

    // The rotated-away refresh token is now rejected.
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: verifyRes.body.refreshToken })
      .expect(401);
  });
});
