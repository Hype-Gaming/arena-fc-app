import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { seedAchievements } from '../prisma/seeds/achievements.seed';
import { signTestAccess } from './utils/auth';

describe('Gamification (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let emitter: EventEmitter2;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    prisma = app.get(PrismaService);
    emitter = app.get(EventEmitter2);
    await seedAchievements(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.userAchievement.deleteMany();
    await prisma.user.deleteMany();
  });

  async function waitForXp(userId: string, expected: number) {
    for (let i = 0; i < 50; i++) {
      const u = await prisma.user.findUnique({ where: { id: userId } });
      if (u && u.xp === expected) return u;
      await new Promise((r) => setTimeout(r, 20));
    }
    throw new Error(`xp did not reach ${expected}`);
  }

  it('emitting daily.login awards XP and recomputes level', async () => {
    const user = await prisma.user.create({
      data: { email: 'g1@test.dev', xp: 0, level: 1 },
    });

    emitter.emit('daily.login', { eventName: 'daily.login', userId: user.id });
    const after = await waitForXp(user.id, 5);

    expect(after.xp).toBe(5);
    expect(after.level).toBe(1);
  });

  it('GET /gamification/me returns xp, level and seeded achievement status', async () => {
    const user = await prisma.user.create({
      data: { email: 'g2@test.dev', xp: 120, level: 2 },
    });
    const token = await signTestAccess(user.id);

    const res = await request(app.getHttpServer())
      .get('/gamification/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Opening the profile registers today's first login and awards +5 XP.
    expect(res.body.xp).toBe(125);
    expect(res.body.level).toBe(2);
    expect(res.body.currentLevelFloor).toBe(100);
    expect(res.body.nextLevelXp).toBe(250);
    expect(Array.isArray(res.body.achievements)).toBe(true);
    const firstUnlock = res.body.achievements.find(
      (a: { key: string }) => a.key === 'first_unlock',
    );
    expect(firstUnlock).toBeDefined();
    expect(firstUnlock.unlocked).toBe(false);
  });

  it('GET /gamification/me requires auth', async () => {
    await request(app.getHttpServer()).get('/gamification/me').expect(401);
  });
});
