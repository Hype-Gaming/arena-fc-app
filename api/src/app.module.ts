// api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './contexts/health/health.module';
import { AuthModule } from './contexts/auth/auth.module';
import { TipsModule } from './contexts/tips/tips.module';
import { TipsterModule } from './contexts/tipster/tipster.module';
import { BillingModule } from './contexts/billing/billing.module';
import { GamificationModule } from './contexts/gamification/gamification.module';
import { AdminModule } from './contexts/admin/admin.module';
import { TutorialModule } from './contexts/tutorial/tutorial.module';
import { MeModule } from './contexts/me/me.module';
import { BilhetesModule } from './contexts/bilhetes/bilhetes.module';
import { TelegramGateModule } from './contexts/telegram-gate/telegram-gate.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    // Per-IP rate limiting, applied where it matters (see AuthController).
    // Disabled under test so e2e suites aren't throttled between cases.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 60 }],
      skipIf: () => process.env.NODE_ENV === 'test',
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    TipsModule,
    TipsterModule,
    BillingModule,
    GamificationModule,
    AdminModule,
    TutorialModule,
    MeModule,
    BilhetesModule,
    TelegramGateModule,
  ],
})
export class AppModule {}
