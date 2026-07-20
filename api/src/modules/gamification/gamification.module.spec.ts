import { Test } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { GamificationModule } from './gamification.module';
import { GamificationService } from './gamification.service';
import { GamificationController } from './gamification.controller';
import { PrismaService } from '../../prisma/prisma.service';

describe('GamificationModule', () => {
  it('compiles and provides the service and controller', async () => {
    const moduleRef = await Test.createTestingModule({
      // GamificationModule pulls in AuthModule, whose controller uses the
      // ThrottlerGuard; its options come from the (global) ThrottlerModule,
      // which AppModule provides at runtime and we supply here in isolation.
      imports: [
        EventEmitterModule.forRoot(),
        ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 60 }] }),
        GamificationModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({
        user: { findUnique: jest.fn(), update: jest.fn() },
        entradaUnlock: { count: jest.fn() },
        entrada: { count: jest.fn() },
        achievement: { findMany: jest.fn() },
        userAchievement: { findMany: jest.fn(), createMany: jest.fn() },
      })
      .compile();

    expect(moduleRef.get(GamificationService)).toBeInstanceOf(GamificationService);
    expect(moduleRef.get(GamificationController)).toBeInstanceOf(GamificationController);
  });
});
