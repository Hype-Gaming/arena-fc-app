import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CreditsService } from '../src/contexts/credits/credits.service';
import { seedPlans } from '../prisma/seeds/plans.seed';
import { signTestAccess } from './utils/auth';

describe('Me (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let credits: CreditsService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    prisma = app.get(PrismaService);
    credits = app.get(CreditsService);
    await seedPlans(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.creditTransaction.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.user.deleteMany();
  });

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer()).get('/me').expect(401);
  });

  it('returns Free plan and live credit balance for a plain user', async () => {
    const user = await prisma.user.create({
      data: { email: 'me-free@test.dev' },
    });
    await credits.applyTransaction({
      userId: user.id,
      type: 'purchase',
      amount: 5,
      refType: 'test',
      refId: 'seed',
    });
    const token = await signTestAccess(user.id, user.email);

    const res = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toEqual({
      email: 'me-free@test.dev',
      nickname: null,
      avatarKey: null,
      planKey: 'free',
      planName: 'Livre',
      creditBalance: 5,
      iaUnlimited: false,
      iaUnlimitedUntil: null,
    });
  });

  it('reports Premium when the user has an active premium subscription', async () => {
    const user = await prisma.user.create({
      data: { email: 'me-premium@test.dev' },
    });
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planKey: 'premium',
        status: 'active',
        provider: 'lastlink',
      },
    });
    const token = await signTestAccess(user.id, user.email);

    const res = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.planKey).toBe('premium');
    expect(res.body.planName).toBe('Premium');
    expect(res.body.creditBalance).toBe(0);
  });
});
