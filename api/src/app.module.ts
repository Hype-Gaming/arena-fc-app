// api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { TipsModule } from './modules/tips/tips.module';
import { TipsterModule } from './modules/tipster/tipster.module';
import { BillingModule } from './modules/billing/billing.module';
import { GamificationModule } from './modules/gamification/gamification.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    HealthModule,
    AuthModule,
    TipsModule,
    TipsterModule,
    BillingModule,
    GamificationModule,
  ],
})
export class AppModule {}
